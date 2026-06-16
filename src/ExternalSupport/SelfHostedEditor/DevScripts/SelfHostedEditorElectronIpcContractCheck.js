import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSelfHostedEditorElectronIpcEnvelope,
  SelfHostedEditorElectronIpcChannel,
} from "../Desktop/ElectronIpcContract.js";
import {
  buildSelfHostedEditorElectronProjectSessionStatus,
  dispatchSelfHostedEditorBackendCommand,
  listSelfHostedEditorElectronBackendCommands,
} from "../Desktop/ElectronBackendCommandDispatcher.js";
import {
  createSelfHostedEditorPreloadApi,
} from "../Desktop/ElectronPreloadApi.js";
import {
  EditorBackendClient,
} from "../Scripts/Backend/Clients/EditorBackendClient.js";
import {
  EditorBackendProjectSessionFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionModel.js";
import {
  EditorBackendTransportCommand,
  listEditorBackendTransportCommands,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const preloadText = fs.readFileSync(path.join(moduleRoot, "Desktop/ElectronPreload.cjs"), "utf8");
assertIncludesText(preloadText, "ipcRenderer", "preload uses Electron IPC internally");
assertIncludesText(preloadText, "SelfHostedEditorElectronIpcChannel", "preload uses fixed SelfHostedEditor IPC channel");
assertIncludesText(preloadText, "buildSelfHostedEditorElectronIpcEnvelope", "preload wraps command payloads in a fixed envelope");
assertNoText(preloadText, "/api/", "preload must not know dev-host routes");
assertNoPattern(preloadText, /\.send\s*\(/, "preload must not use fire-and-forget IPC send");
assertNoPattern(preloadText, /\.sendSync\s*\(/, "preload must not use sync IPC");

const mainText = fs.readFileSync(path.join(moduleRoot, "Desktop/ElectronMain.js"), "utf8");
assertIncludesText(mainText, "registerSelfHostedEditorBackendIpc", "Electron main registers backend IPC");
assertNoText(mainText, "/api/", "Electron main must not know dev-host routes");
assertNoText(mainText, "localhost", "Electron main must not depend on localhost product API");
assertNoText(mainText, "127.0.0.1", "Electron main must not depend on localhost product API");

const backendCommands = listEditorBackendTransportCommands();
assertEqual(
  listSelfHostedEditorElectronBackendCommands().length,
  backendCommands.length,
  "Electron backend command list mirrors transport catalog"
);

const envelope = buildSelfHostedEditorElectronIpcEnvelope(EditorBackendTransportCommand.ProjectSessionStatus, {
  sessionId: "desktop-ipc-session",
});
assertEqual(envelope.command, EditorBackendTransportCommand.ProjectSessionStatus, "IPC envelope command");
assertEqual(envelope.payload.sessionId, "desktop-ipc-session", "IPC envelope payload");
assertEqual(SelfHostedEditorElectronIpcChannel, "inscape.self-hosted-editor.backend.invoke", "IPC channel name");

const projectSessionStatus = await dispatchSelfHostedEditorBackendCommand(EditorBackendTransportCommand.ProjectSessionStatus, {
  sessionId: "desktop-ipc-session",
  workspace: {
    activeRelativePath: "story/opening.inscape",
    documents: [
      {
        relativePath: "story/opening.inscape",
        revision: 3,
        text: "# Opening\nNarrator: secret text must not leak",
      },
      {
        relativePath: "story/ending.inscape",
        revision: 2,
        text: "# Ending",
      },
    ],
    revision: 3,
    workspaceName: "Smoke Workspace",
    workspaceRoot: "D:/Inscape/Smoke",
  },
});
assertEqual(projectSessionStatus.format, EditorBackendProjectSessionFormat, "desktop IPC status format");
assertEqual(projectSessionStatus.mode, "embedded-desktop", "desktop IPC status mode");
assertEqual(projectSessionStatus.sessionId, "desktop-ipc-session", "desktop IPC status session id");
assertEqual(projectSessionStatus.workspace.documentCount, 2, "desktop IPC status document count");
assertEqual(projectSessionStatus.workspace.activeRelativePath, "story/opening.inscape", "desktop IPC status active path");
assertEqual(projectSessionStatus.workspace.documents[0].text, undefined, "desktop IPC status must not expose document text");

const directStatus = buildSelfHostedEditorElectronProjectSessionStatus({
  sessionId: "direct-status",
});
assertEqual(directStatus.mode, "embedded-desktop", "direct status mode");

let unknownCommandRejected = false;
try {
  await dispatchSelfHostedEditorBackendCommand("unknown.command", {});
} catch {
  unknownCommandRejected = true;
}
assertEqual(unknownCommandRejected, true, "Electron backend rejects unknown commands");

let unimplementedCommandRejected = false;
try {
  await dispatchSelfHostedEditorBackendCommand(EditorBackendTransportCommand.LanguageDiagnostics, {
    scriptText: "# Opening",
  });
} catch (error) {
  unimplementedCommandRejected = String(error?.message || "").includes("not wired yet");
}
assertEqual(unimplementedCommandRejected, true, "Electron backend rejects unwired commands explicitly");

const preloadCalls = [];
const preloadApi = createSelfHostedEditorPreloadApi({
  handlers: Object.fromEntries(backendCommands.map((command) => [
    command,
    async (payload = {}) => {
      preloadCalls.push(buildSelfHostedEditorElectronIpcEnvelope(command, payload));
      return await dispatchSelfHostedEditorBackendCommand(command, payload);
    },
  ])),
});
const backendClient = new EditorBackendClient({
  globalObject: {
    inscapeSelfHostedEditor: preloadApi,
  },
  sessionId: "client-desktop-session",
});
const normalizedStatus = await backendClient.projectSession.status({
  workspace: {
    documents: [
      {
        relativePath: "story/client.inscape",
        text: "# Client",
      },
    ],
  },
});
assertEqual(normalizedStatus.mode, "embedded-desktop", "EditorBackendClient preserves desktop project-session status");
assertEqual(preloadCalls[0].command, EditorBackendTransportCommand.ProjectSessionStatus, "preload API forwards project status command");
assertEqual(Object.keys(preloadCalls[0].payload).length, 0, "preload API does not upload workspace text for project status");

console.log("SelfHostedEditor Electron IPC contract ok");

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
