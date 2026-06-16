import {
  createSelfHostedEditorPreloadApi,
  validateSelfHostedEditorPreloadCommandPayload,
} from "../Desktop/ElectronPreloadApi.js";
import { EditorBackendClient } from "../Scripts/Backend/Clients/EditorBackendClient.js";
import { EditorBackendTransportCommand } from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import {
  hasSelfHostedEditorPreloadApi,
  SelfHostedEditorPreloadBackendTransport,
} from "../Scripts/Backend/Clients/SelfHostedEditorPreloadBackendTransport.js";

const preloadCalls = [];
const preloadApi = createSelfHostedEditorPreloadApi({
  handlers: {
    [EditorBackendTransportCommand.DocumentBufferSave]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.DocumentBufferSave, payload });
      return {
        ok: true,
        relativePath: payload.relativePath,
        saveStatus: {
          state: "saved",
        },
      };
    },
    [EditorBackendTransportCommand.DocumentBufferSaveAll]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.DocumentBufferSaveAll, payload });
      return {
        ok: true,
        savedCount: 1,
      };
    },
    [EditorBackendTransportCommand.LanguageDiagnostics]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.LanguageDiagnostics, payload });
      return { diagnostics: [] };
    },
    [EditorBackendTransportCommand.ProjectSessionStatus]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.ProjectSessionStatus, payload });
      return {
        caches: {},
        languageSession: {
          kind: "process-per-request",
          supportedEndpoints: ["diagnostics"],
        },
      };
    },
    [EditorBackendTransportCommand.RecoveryDiscard]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.RecoveryDiscard, payload });
      return {
        action: "discard",
        ok: true,
      };
    },
    [EditorBackendTransportCommand.RecoveryLater]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.RecoveryLater, payload });
      return {
        action: "later",
        ok: true,
      };
    },
    [EditorBackendTransportCommand.RecoveryRestore]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.RecoveryRestore, payload });
      return {
        action: "restore",
        ok: true,
      };
    },
    [EditorBackendTransportCommand.RuntimeStep]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.RuntimeStep, payload });
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
    [EditorBackendTransportCommand.WorkspaceListFiles]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.WorkspaceListFiles, payload });
      return {
        documents: [],
      };
    },
    [EditorBackendTransportCommand.WorkspaceOpenFolder]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.WorkspaceOpenFolder, payload });
      return {
        ok: true,
      };
    },
    [EditorBackendTransportCommand.WorkspaceWriteBackBackup]: async (payload) => {
      preloadCalls.push({ command: EditorBackendTransportCommand.WorkspaceWriteBackBackup, payload });
      return {
        copiedCount: 1,
        ok: true,
      };
    },
  },
});

assertEqual(typeof preloadApi.invoke, "undefined", "preload API must not expose generic invoke");
assertEqual(typeof preloadApi.send, "undefined", "preload API must not expose generic send");
assertEqual(typeof preloadApi.request, "undefined", "preload API must not expose generic request");
assertEqual(hasSelfHostedEditorPreloadApi({ inscapeSelfHostedEditor: preloadApi }), true, "preload API detection");
assertEqual(hasSelfHostedEditorPreloadApi({}), false, "missing preload API detection");

let unknownPreloadCommandRejected = false;
try {
  validateSelfHostedEditorPreloadCommandPayload("unknown.command", {});
} catch {
  unknownPreloadCommandRejected = true;
}
assertEqual(unknownPreloadCommandRejected, true, "preload API rejects unknown command");

let invalidPreloadPayloadRejected = false;
try {
  await preloadApi.languageSession.diagnose({
    arbitrary: true,
    scriptText: "# Opening",
  });
} catch {
  invalidPreloadPayloadRejected = true;
}
assertEqual(invalidPreloadPayloadRejected, true, "preload API rejects unexpected payload keys");

const preloadTransport = new SelfHostedEditorPreloadBackendTransport({ preloadApi });
const diagnosticsResult = await preloadTransport.invoke(EditorBackendTransportCommand.LanguageDiagnostics, {
  scriptText: "# Opening",
});
assertEqual(Array.isArray(diagnosticsResult.diagnostics), true, "preload transport diagnostics payload");
assertEqual(preloadCalls[0].command, EditorBackendTransportCommand.LanguageDiagnostics, "preload transport diagnostics command");
assertEqual(preloadCalls[0].payload.scriptText, "# Opening", "preload transport forwards payload");
const saveResult = await preloadTransport.invoke(EditorBackendTransportCommand.DocumentBufferSave, {
  baseRevision: 2,
  relativePath: "story/opening.inscape",
});
assertEqual(saveResult.ok, true, "preload transport document save payload");
const saveCall = preloadCalls.find((call) => call.command === EditorBackendTransportCommand.DocumentBufferSave);
assertEqual(saveCall.payload.relativePath, "story/opening.inscape", "preload transport document save command");
const saveAllResult = await preloadTransport.invoke(EditorBackendTransportCommand.DocumentBufferSaveAll, {
  workspaceId: "workspace-1",
});
assertEqual(saveAllResult.savedCount, 1, "preload transport document save all payload");
const openWorkspaceResult = await preloadTransport.invoke(EditorBackendTransportCommand.WorkspaceOpenFolder, {
  dialogTitle: "Open workspace",
});
assertEqual(openWorkspaceResult.ok, true, "preload transport workspace open payload");
const workspaceOpenCall = preloadCalls.find((call) => call.command === EditorBackendTransportCommand.WorkspaceOpenFolder);
assertEqual(workspaceOpenCall.payload.dialogTitle, "Open workspace", "preload transport workspace open command");
const writeBackBackupResult = await preloadTransport.invoke(EditorBackendTransportCommand.WorkspaceWriteBackBackup, {
  writeRequests: [
    {
      relativePath: "localization/zh-cn.csv",
    },
  ],
});
assertEqual(writeBackBackupResult.copiedCount, 1, "preload transport write-back backup payload");
const writeBackBackupCall = preloadCalls.find((call) => call.command === EditorBackendTransportCommand.WorkspaceWriteBackBackup);
assertEqual(writeBackBackupCall.payload.writeRequests[0].relativePath, "localization/zh-cn.csv", "preload transport write-back backup command");
const recoveryRestoreResult = await preloadTransport.invoke(EditorBackendTransportCommand.RecoveryRestore, {
  contentHash: "fnv1a32:restore",
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryRestoreResult.action, "restore", "preload transport recovery restore payload");
const recoveryRestoreCall = preloadCalls.find((call) => call.command === EditorBackendTransportCommand.RecoveryRestore);
assertEqual(recoveryRestoreCall.payload.relativePath, "story/opening.inscape", "preload transport recovery restore command");
const recoveryLaterResult = await preloadTransport.invoke(EditorBackendTransportCommand.RecoveryLater, {
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryLaterResult.action, "later", "preload transport recovery later payload");
const recoveryDiscardResult = await preloadTransport.invoke(EditorBackendTransportCommand.RecoveryDiscard, {
  relativePath: "story/opening.inscape",
});
assertEqual(recoveryDiscardResult.action, "discard", "preload transport recovery discard payload");

let unknownCommandRejected = false;
try {
  await preloadTransport.invoke("unknown.command", {});
} catch {
  unknownCommandRejected = true;
}
assertEqual(unknownCommandRejected, true, "preload transport rejects unknown commands");

const desktopBackendClient = new EditorBackendClient({
  globalObject: {
    inscapeSelfHostedEditor: preloadApi,
  },
  sessionId: "desktop-session",
});
await desktopBackendClient.languageSession.diagnose({ scriptText: "# Desktop" });
const desktopDiagnosticsCall = preloadCalls.find((call) =>
  call.command === EditorBackendTransportCommand.LanguageDiagnostics
  && call.payload.scriptText === "# Desktop"
);
assertEqual(Boolean(desktopDiagnosticsCall), true, "default desktop backend client uses preload transport");
const runtimeStep = await desktopBackendClient.runtimeSession.step({
  action: {
    kind: "continue",
  },
});
assertEqual(runtimeStep.currentNode.name, "Opening", "desktop backend client runtime preload payload");
const projectStatus = await desktopBackendClient.projectSession.status();
assertEqual(projectStatus.sessionId, "desktop-session", "desktop backend client project session id");
const desktopSave = await desktopBackendClient.documentBuffer.saveDocument({
  baseRevision: 3,
  relativePath: "story/desktop.inscape",
});
assertEqual(desktopSave.saveStatus.state, "saved", "desktop backend client document save preload payload");
const desktopWorkspaceOpen = await desktopBackendClient.workspace.openFolder({
  dialogTitle: "Open desktop workspace",
});
assertEqual(desktopWorkspaceOpen.ok, true, "desktop backend client workspace open preload payload");
const desktopWriteBackBackup = await desktopBackendClient.workspace.writeBackBackup({
  writeRequests: [
    {
      relativePath: "inscape.node-map.json",
    },
  ],
});
assertEqual(desktopWriteBackBackup.copiedCount, 1, "desktop backend client write-back backup preload payload");
const desktopRecoveryRestore = await desktopBackendClient.recovery.restore({
  relativePath: "story/desktop.inscape",
});
assertEqual(desktopRecoveryRestore.action, "restore", "desktop backend client recovery restore preload payload");

const fetchCalls = [];
const devBackendClient = new EditorBackendClient({
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
          diagnostics: [],
        };
      },
    };
  },
  globalObject: {},
});
await devBackendClient.languageSession.diagnose({ scriptText: "# Dev" });
assertEqual(fetchCalls[0].url, "http://127.0.0.1:5178/api/diagnostics", "dev backend client keeps HTTP transport");

console.log("SelfHostedEditor preload transport contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
