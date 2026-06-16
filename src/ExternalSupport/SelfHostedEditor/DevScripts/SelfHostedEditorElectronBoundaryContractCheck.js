import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelfHostedEditorPreloadApi,
  listSelfHostedEditorPreloadCommands,
} from "../Desktop/ElectronPreloadApi.js";
import {
  listEditorBackendTransportCommands,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import {
  SelfHostedEditorPreloadBackendTransport,
} from "../Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rendererScriptsRoot = path.join(moduleRoot, "Scripts");

for (const scriptPath of getJavaScriptFiles(rendererScriptsRoot)) {
  const relativePath = path.relative(moduleRoot, scriptPath).replace(/\\/g, "/");
  const text = fs.readFileSync(scriptPath, "utf8");
  assertNoPattern(text, /from\s+["']electron["']|import\s*\(\s*["']electron["']\s*\)/, `${relativePath} must not import Electron`);
  assertNoPattern(text, /from\s+["']node:|require\s*\(\s*["'](?:node:)?(?:fs|child_process|electron)["']\s*\)/, `${relativePath} must not import Node runtime`);
  assertNoText(text, "ipcRenderer", `${relativePath} must not use ipcRenderer`);
  if (relativePath !== "Scripts/Backend/Clients/EditorBackendTransport.js") {
    assertNoText(text, "/api/", `${relativePath} must not know dev-host API routes`);
  }
}

const preloadText = readModuleText("Desktop/ElectronPreload.js");
assertIncludesText(preloadText, "contextBridge", "preload uses contextBridge");
assertNoText(preloadText, "ipcRenderer", "preload must not expose ipcRenderer");
assertNoText(preloadText, "node:fs", "preload must not import fs");
assertNoText(preloadText, "child_process", "preload must not import child_process");

const preloadApiText = readModuleText("Desktop/ElectronPreloadApi.js");
for (const forbidden of ["invoke", "send", "request", "readFile", "writeFile", "runCommand"]) {
  assertNoText(preloadApiText, forbidden, `preload API must not expose ${forbidden}`);
}

const preloadTransportText = readModuleText("Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js");
assertNoText(preloadTransportText, "/api/", "preload transport must not know HTTP routes");
assertNoText(preloadTransportText, "fetch(", "preload transport must not fetch");
assertNoText(preloadTransportText, "postJson", "preload transport must not expose HTTP helper");

const backendCommands = listEditorBackendTransportCommands();
const preloadCommands = listSelfHostedEditorPreloadCommands();
for (const command of backendCommands) {
  assertEqual(preloadCommands.includes(command), true, `preload command whitelist covers ${command}`);
}

const handlers = Object.fromEntries(backendCommands.map((command) => [
  command,
  async (payload) => ({
    command,
    payload,
  }),
]));
const preloadApi = createSelfHostedEditorPreloadApi({ handlers });
const preloadTransport = new SelfHostedEditorPreloadBackendTransport({ preloadApi });
for (const command of backendCommands) {
  const result = await preloadTransport.invoke(command, {});
  assertEqual(result.command, command, `preload transport handles ${command}`);
}

console.log("SelfHostedEditor Electron boundary contract ok");

function readModuleText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
}

function getJavaScriptFiles(rootPath) {
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

function assertIncludesText(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label}: expected ${expected}`);
  }
}

function assertNoText(text, forbidden, label) {
  if (text.includes(forbidden)) {
    throw new Error(`${label}: unexpected ${forbidden}`);
  }
}

function assertNoPattern(text, pattern, label) {
  if (pattern.test(text)) {
    throw new Error(label);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
