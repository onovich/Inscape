import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredDesktopPaths = [
  "Desktop/ElectronAppEntry.js",
  "Desktop/ElectronBackendCommandDispatcher.js",
  "Desktop/ElectronBackendIpc.js",
  "Desktop/ElectronIpcContract.js",
  "Desktop/ElectronMain.js",
  "Desktop/ElectronPreloadApi.js",
  "Desktop/ElectronPreload.js",
  "Desktop/ElectronWorkspaceSessionStore.js",
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
assertIncludesText(mainText, "inscape-self-hosted-editor", "Electron main defines app protocol");
assertIncludesText(mainText, "buildSelfHostedEditorWorkbenchUrl", "Electron main builds app protocol workbench URL");
assertIncludesText(mainText, "registerSelfHostedEditorProtocol", "Electron main registers app protocol handler");
assertIncludesText(mainText, "resolveSelfHostedEditorProtocolFilePath", "Electron main exposes app protocol file resolver");
assertIncludesText(mainText, "loadURL", "Electron main loads workbench through app protocol");
assertIncludesText(mainText, "buildSelfHostedEditorBrowserWindowOptions", "Electron main exports BrowserWindow options builder");
assertIncludesText(mainText, "applySelfHostedEditorWindowSecurity", "Electron main applies window security handlers");
assertIncludesText(mainText, "registerSelfHostedEditorBackendIpc", "Electron main registers fixed backend IPC");
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
assertNoText(mainText, "loadFile", "Electron main must not load file URLs for packaged Workbench assets");
assertNoText(mainText, "/api/", "Electron main must not know dev-host routes");
assertNoText(mainText, "localhost", "Electron main must not depend on localhost product API");
assertNoText(mainText, "127.0.0.1", "Electron main must not depend on localhost product API");

const preloadText = readModuleText("Desktop/ElectronPreload.js");
assertIncludesText(preloadText, "contextBridge", "Electron preload uses contextBridge");
assertIncludesText(preloadText, "exposeInMainWorld", "Electron preload exposes a named API");
assertIncludesText(preloadText, "createSelfHostedEditorPreloadApi", "Electron preload delegates API shape to whitelist module");
assertIncludesText(preloadText, "ipcRenderer", "Electron preload uses IPC internally");
assertIncludesText(preloadText, "SelfHostedEditorElectronIpcChannel", "Electron preload uses fixed backend IPC channel");
assertNoText(preloadText, "/api/", "Electron preload must not know dev-host routes");
assertNoText(preloadText, "node:fs", "Electron preload must not expose filesystem yet");
assertNoText(preloadText, "child_process", "Electron preload must not expose process control");

const preloadApiText = readModuleText("Desktop/ElectronPreloadApi.js");
assertIncludesText(preloadApiText, "SelfHostedEditorPreloadEditorCommand", "Electron preload API defines command whitelist");
assertIncludesText(preloadApiText, "inscapeSelfHostedEditor", "Electron preload API name");
assertIncludesText(preloadApiText, "backendCommandTransport: \"electron-ipc\"", "Electron preload API declares IPC command transport");
assertIncludesText(preloadApiText, "embeddedBackend: \"workspace-session-v0-partial\"", "Electron preload declares partial embedded backend capability");
assertIncludesText(preloadApiText, "workspaceFileSystem: \"read-write-buffer-session\"", "Electron preload declares read/write buffer workspace file capability");
assertIncludesText(preloadApiText, "ProjectSessionStatus", "Electron preload API whitelists project-session status");
assertIncludesText(preloadApiText, "DocumentBufferRead", "Electron preload API whitelists document-buffer read");
assertIncludesText(preloadApiText, "WorkspaceOpenFolder", "Electron preload API whitelists workspace open folder");
assertIncludesText(preloadApiText, "validateSelfHostedEditorPreloadCommandPayload", "Electron preload API validates command payloads");
assertNoText(preloadApiText, "invoke", "Electron preload API must not expose generic invoke");
assertNoText(preloadApiText, "send", "Electron preload API must not expose generic send");
assertNoText(preloadApiText, "request", "Electron preload API must not expose generic request");
assertNoText(preloadApiText, "ipcRenderer", "Electron preload API must not use IPC directly");
assertNoText(preloadApiText, "/api/", "Electron preload API must not know dev-host routes");

const ipcContractText = readModuleText("Desktop/ElectronIpcContract.js");
assertIncludesText(ipcContractText, "inscape.self-hosted-editor.backend.invoke", "Electron IPC contract defines a fixed channel");

const ipcDispatcherText = readModuleText("Desktop/ElectronBackendCommandDispatcher.js");
assertIncludesText(ipcDispatcherText, "validateSelfHostedEditorPreloadCommandPayload", "Electron backend dispatcher validates payloads");
assertIncludesText(ipcDispatcherText, "createSelfHostedEditorElectronWorkspaceSessionStore", "Electron backend dispatcher owns workspace session store boundary");
assertNoText(ipcDispatcherText, "/api/", "Electron backend dispatcher must not know dev-host routes");

const ipcMainText = readModuleText("Desktop/ElectronBackendIpc.js");
assertIncludesText(ipcMainText, "ipcMain", "Electron backend IPC module owns ipcMain access");
assertIncludesText(ipcMainText, "showOpenDialog", "Electron backend IPC selects workspace folders through native dialog");
assertIncludesText(ipcMainText, "SelfHostedEditorElectronIpcChannel", "Electron backend IPC uses fixed channel");
assertNoText(ipcMainText, "/api/", "Electron backend IPC module must not know dev-host routes");

const workspaceStoreText = readModuleText("Desktop/ElectronWorkspaceSessionStore.js");
assertIncludesText(workspaceStoreText, "node:fs", "Electron workspace store owns filesystem access");
assertIncludesText(workspaceStoreText, "EditorBackendWorkspacePathModel", "Electron workspace store reuses workspace path guard");
assertIncludesText(workspaceStoreText, "EditorBackendDocumentBufferStoreModel", "Electron workspace store reuses document buffer store model");
assertNoText(workspaceStoreText, "/api/", "Electron workspace store must not know dev-host routes");

const preloadApiModule = await import("../Desktop/ElectronPreloadApi.js");
const preloadApi = preloadApiModule.createSelfHostedEditorPreloadApi();
assertEqual(Object.isFrozen(preloadApi), true, "Electron preload API is frozen");
assertEqual(preloadApi.capabilities.backendCommandTransport, "electron-ipc", "Electron preload API command transport capability");
assertEqual(preloadApi.capabilities.embeddedBackend, "workspace-session-v0-partial", "Electron preload API embedded backend capability");
assertEqual(preloadApi.capabilities.workspaceFileSystem, "read-write-buffer-session", "Electron preload API workspace file capability");
assertEqual(preloadApi.editorCommands.ProjectSessionStatus, "project-session.status", "Electron preload project-session command");
assertEqual(
  preloadApiModule.listSelfHostedEditorPreloadCommands().length,
  new Set(preloadApiModule.listSelfHostedEditorPreloadCommands()).size,
  "Electron preload commands are unique"
);

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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
