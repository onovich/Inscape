import { EditorBackendClient } from "../Scripts/Backend/Clients/EditorBackendClient.js";
import {
  EditorBackendTransportCommand,
  listEditorBackendDevHostRoutes,
  listEditorBackendTransportCommands,
  resolveEditorBackendDevHostRoute,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import { SelfHostedEditorHttpBackendTransport } from "../Scripts/Backend/Clients/SelfHostedEditorHttpBackendTransport.js";

const commands = listEditorBackendTransportCommands();
assertEqual(commands.length, new Set(commands).size, "backend transport commands must be unique");
assertEqual(resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.LanguageDiagnostics), "/api/diagnostics", "diagnostics dev-host route");
assertEqual(resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.DocumentBufferSave), "/api/document-buffer-save", "document-buffer save dev-host route");
assertEqual(resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.DocumentBufferSaveAll), "/api/document-buffer-save-all", "document-buffer save all dev-host route");
assertEqual(resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.ProjectSessionStatus), "/api/session-cache-status", "project-session status dev-host route");
assertEqual(resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.RuntimeStep), "/api/runtime-action", "runtime step dev-host route");
let desktopOnlyRouteRejected = false;
try {
  resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceOpenFolder);
} catch (error) {
  desktopOnlyRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
}
assertEqual(desktopOnlyRouteRejected, true, "workspace open command is desktop-only");
let recoveryRouteRejected = false;
try {
  resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.RecoveryRestore);
} catch (error) {
  recoveryRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
}
assertEqual(recoveryRouteRejected, true, "recovery restore command is desktop-only");
let backupRouteRejected = false;
try {
  resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceWriteBackBackup);
} catch (error) {
  backupRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
}
assertEqual(backupRouteRejected, true, "write-back backup command is desktop-only");
let nodeMapSidecarWriteRouteRejected = false;
try {
  resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.StableNodeMapWriteSidecar);
} catch (error) {
  nodeMapSidecarWriteRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
}
assertEqual(nodeMapSidecarWriteRouteRejected, true, "node-map sidecar write command is desktop-only");
let assetImportRouteRejected = false;
try {
  resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceImportAssets);
} catch (error) {
  assetImportRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
}
assertEqual(assetImportRouteRejected, true, "asset import command is desktop-only");

for (const route of listEditorBackendDevHostRoutes()) {
  assertEqual(commands.includes(route.command), true, `dev-host route command registered: ${route.command}`);
  assertEqual(route.routePath.startsWith("/api/"), true, `dev-host route path shape: ${route.command}`);
}

let unknownCommandRejected = false;
try {
  resolveEditorBackendDevHostRoute("unknown.command");
} catch {
  unknownCommandRejected = true;
}
assertEqual(unknownCommandRejected, true, "unknown transport command must be rejected");

const fetchCalls = [];
const httpTransport = new SelfHostedEditorHttpBackendTransport({
  baseUrl: "http://127.0.0.1:5178",
  fetchImpl: async (url, options) => {
    fetchCalls.push({
      body: options.body,
      method: options.method,
      url,
    });
    return {
      ok: true,
      async json() {
        return {
          ok: true,
        };
      },
    };
  },
});
const httpResult = await httpTransport.invoke(EditorBackendTransportCommand.LanguageDiagnostics, {
  scriptText: "# Opening",
});
assertEqual(httpResult.ok, true, "HTTP transport invoke result");
assertEqual(fetchCalls[0].url, "http://127.0.0.1:5178/api/diagnostics", "HTTP transport maps command to route");
assertEqual(fetchCalls[0].method, "POST", "HTTP transport uses POST");
assertEqual(JSON.parse(fetchCalls[0].body).scriptText, "# Opening", "HTTP transport serializes payload");

const boundFetchTransport = new SelfHostedEditorHttpBackendTransport({
  fetchImpl(url) {
    assertEqual(this, globalThis, "HTTP transport keeps default fetch binding");
    return {
      ok: true,
      async json() {
        return {
          url,
        };
      },
    };
  },
});
const boundFetchResult = await boundFetchTransport.invoke(EditorBackendTransportCommand.LanguageDiagnostics, {});
assertEqual(boundFetchResult.url, "/api/diagnostics", "HTTP transport bound fetch result");

const backendCalls = [];
const backendClient = new EditorBackendClient({
  sessionId: "transport-session",
  transport: {
    async invoke(command, payload) {
      backendCalls.push({
        command,
        payload,
      });
      if (command === EditorBackendTransportCommand.ProjectSessionStatus) {
        return {
          caches: {},
        };
      }

      return {
        command,
        payload,
      };
    },
  },
});
const diagnostics = await backendClient.languageSession.diagnose({
  scriptText: "# Opening",
});
assertEqual(diagnostics.command, EditorBackendTransportCommand.LanguageDiagnostics, "backend client diagnostics command");
assertEqual(backendCalls[0].payload.scriptText, "# Opening", "backend client diagnostics payload");
const runtimeStep = await backendClient.runtimeSession.step({
  action: {
    kind: "continue",
  },
});
assertEqual(runtimeStep.command, EditorBackendTransportCommand.RuntimeStep, "backend client runtime command");
const documentSave = await backendClient.documentBuffer.saveDocument({
  baseRevision: 7,
  relativePath: "story/opening.inscape",
});
assertEqual(documentSave.command, EditorBackendTransportCommand.DocumentBufferSave, "backend client document save command");
assertEqual(documentSave.payload.relativePath, "story/opening.inscape", "backend client document save payload");
const documentSaveAll = await backendClient.documentBuffer.saveAll({
  workspaceId: "main-workspace",
});
assertEqual(documentSaveAll.command, EditorBackendTransportCommand.DocumentBufferSaveAll, "backend client document save all command");
const workspaceOpen = await backendClient.workspace.openFolder({
  dialogTitle: "Open workspace",
});
assertEqual(workspaceOpen.command, EditorBackendTransportCommand.WorkspaceOpenFolder, "backend client workspace open command");
const workspaceList = await backendClient.workspace.listFiles();
assertEqual(workspaceList.command, EditorBackendTransportCommand.WorkspaceListFiles, "backend client workspace list command");
const workspaceAssetImport = await backendClient.workspace.importAssets({
  dialogTitle: "Import assets",
});
assertEqual(workspaceAssetImport.command, EditorBackendTransportCommand.WorkspaceImportAssets, "backend client workspace asset import command");
assertEqual(workspaceAssetImport.payload.dialogTitle, "Import assets", "backend client workspace asset import payload");
const workspaceBackup = await backendClient.workspace.writeBackBackup({
  writeRequests: [
    {
      relativePath: "localization/zh-cn.csv",
    },
  ],
});
assertEqual(workspaceBackup.command, EditorBackendTransportCommand.WorkspaceWriteBackBackup, "backend client workspace backup command");
assertEqual(workspaceBackup.payload.writeRequests[0].relativePath, "localization/zh-cn.csv", "backend client workspace backup payload");
const nodeMapSidecarWrite = await backendClient.stableNodeMap.writeSidecar({
  nodeMapText: "{}",
  relativePath: "inscape.node-map.json",
});
assertEqual(nodeMapSidecarWrite.command, EditorBackendTransportCommand.StableNodeMapWriteSidecar, "backend client node-map sidecar write command");
assertEqual(nodeMapSidecarWrite.payload.relativePath, "inscape.node-map.json", "backend client node-map sidecar write payload");
const recoveryRestore = await backendClient.recovery.restore({
  contentHash: "fnv1a32:restore",
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryRestore.command, EditorBackendTransportCommand.RecoveryRestore, "backend client recovery restore command");
assertEqual(recoveryRestore.payload.relativePath, "story/opening.inscape", "backend client recovery restore payload");
const recoveryLater = await backendClient.recovery.later({
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryLater.command, EditorBackendTransportCommand.RecoveryLater, "backend client recovery later command");
const recoveryDiscard = await backendClient.recovery.discard({
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryDiscard.command, EditorBackendTransportCommand.RecoveryDiscard, "backend client recovery discard command");
const projectStatus = await backendClient.projectSession.status();
assertEqual(backendCalls.find((call) => call.command === EditorBackendTransportCommand.ProjectSessionStatus)?.payload && Object.keys(backendCalls.find((call) => call.command === EditorBackendTransportCommand.ProjectSessionStatus).payload).length, 0, "project-session status must not upload workspace text");
assertEqual(projectStatus.mode, "dev-host", "project-session status compatibility mode");
assertEqual(typeof backendClient.invoke, "undefined", "backend client must not expose generic invoke");
assertEqual(typeof backendClient.request, "undefined", "backend client must not expose generic request");

let missingInvokeRejected = false;
try {
  new EditorBackendClient({
    transport: {
      async postJson() {
        return {};
      },
    },
  });
} catch {
  missingInvokeRejected = true;
}
assertEqual(missingInvokeRejected, true, "backend client must require invoke transport");

console.log("SelfHostedEditor backend transport contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
