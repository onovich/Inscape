import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredDesktopPaths = [
  "Desktop/ElectronAppEntry.js",
  "Desktop/ElectronMain.js",
  "Desktop/ElectronPreload.js",
];

for (const relativePath of requiredDesktopPaths) {
  if (!fs.existsSync(path.join(moduleRoot, relativePath))) {
    throw new Error(`Missing SelfHostedEditor Electron shell path: ${relativePath}`);
  }
}

const appEntryText = readModuleText("Desktop/ElectronAppEntry.js");
assertIncludesText(appEntryText, "SelfHostedEditorElectronAppEntry", "Electron app entry exports app entry metadata");
assertIncludesText(appEntryText, "../Scripts/Entries/SelfHostedEditorAppEntry.js", "Electron app entry references renderer app entry");
assertIncludesText(appEntryText, "../Resources/Workbench/SelfHostedEditorWorkbenchDocument.html", "Electron app entry references workbench document");
assertNoText(appEntryText, "electron", "Electron app entry must stay renderer-neutral");
assertNoText(appEntryText, "/api/", "Electron app entry must not know dev-host routes");

const mainText = readModuleText("Desktop/ElectronMain.js");
assertIncludesText(mainText, "BrowserWindow", "Electron main creates BrowserWindow");
assertIncludesText(mainText, "ElectronPreload.js", "Electron main wires preload script");
assertIncludesText(mainText, "SelfHostedEditorWorkbenchDocument.html", "Electron main loads workbench document");
assertIncludesText(mainText, "buildSelfHostedEditorBrowserWindowOptions", "Electron main exports BrowserWindow options builder");
assertIncludesText(mainText, "applySelfHostedEditorWindowSecurity", "Electron main applies window security handlers");
assertIncludesText(mainText, "setWindowOpenHandler", "Electron main blocks window open by default");
assertIncludesText(mainText, "will-navigate", "Electron main filters navigation");
assertIncludesText(mainText, "contextIsolation: true", "Electron main enables context isolation");
assertIncludesText(mainText, "nodeIntegration: false", "Electron main disables renderer node integration");
assertIncludesText(mainText, "nodeIntegrationInSubFrames: false", "Electron main disables node integration in subframes");
assertIncludesText(mainText, "nodeIntegrationInWorker: false", "Electron main disables node integration in workers");
assertIncludesText(mainText, "sandbox: true", "Electron main enables sandbox");
assertIncludesText(mainText, "webSecurity: true", "Electron main keeps web security enabled");
assertIncludesText(mainText, "allowRunningInsecureContent: false", "Electron main blocks insecure content");
assertIncludesText(mainText, "webviewTag: false", "Electron main disables webview tags");
assertNoText(mainText, "ipcMain", "Round 7 Electron main must not expose IPC yet");
assertNoText(mainText, "/api/", "Electron main must not know dev-host routes");
assertNoText(mainText, "localhost", "Electron main must not depend on localhost product API");
assertNoText(mainText, "127.0.0.1", "Electron main must not depend on localhost product API");

const preloadText = readModuleText("Desktop/ElectronPreload.js");
assertIncludesText(preloadText, "contextBridge", "Electron preload uses contextBridge");
assertIncludesText(preloadText, "exposeInMainWorld", "Electron preload exposes a named API");
assertIncludesText(preloadText, "inscapeSelfHostedEditor", "Electron preload API name");
assertIncludesText(preloadText, "embeddedBackend: false", "Electron preload does not claim embedded backend yet");
assertIncludesText(preloadText, "workspaceFileSystem: false", "Electron preload does not claim workspace file IO yet");
assertNoText(preloadText, "ipcRenderer", "Round 7 Electron preload must not expose IPC yet");
assertNoText(preloadText, "/api/", "Electron preload must not know dev-host routes");
assertNoText(preloadText, "node:fs", "Electron preload must not expose filesystem yet");
assertNoText(preloadText, "child_process", "Electron preload must not expose process control");

console.log("SelfHostedEditor Electron shell contract ok");

function readModuleText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
}

function assertIncludesText(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

function assertNoText(text, forbidden, label) {
  if (text.includes(forbidden)) {
    throw new Error(`${label}: unexpected ${forbidden}`);
  }
}
