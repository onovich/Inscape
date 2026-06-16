import { DocumentBufferStore } from "../Scripts/Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendDesktopSessionModel } from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import { EditorBackendWorkspaceFolderModel } from "../Scripts/Backend/Models/EditorBackendWorkspaceFolderModel.js";
import { EditorBackendWorkspaceSnapshotFormat } from "../Scripts/Backend/Models/EditorBackendWorkspaceSnapshotModel.js";
import { SelfHostedEditorCompletionBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js";
import { SelfHostedEditorDiagnosticsBridge } from "../Scripts/LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js";
import { SelfHostedEditorRuntimeBridge } from "../Scripts/Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";

const workspaceRoot = "C:/Case Files/Court Loop";
const activeRelativePath = "story/opening.inscape";
const initialText = "# Opening\nNarrator: Welcome.";
const editedText = "# Opening\nNarrator: Welcome.\n-> Branch";

const workspaceFolder = EditorBackendWorkspaceFolderModel.buildWorkspaceFolder({
  activeRelativePath,
  documents: [
    {
      existsOnDisk: true,
      relativePath: activeRelativePath,
      text: initialText,
    },
    {
      existsOnDisk: true,
      relativePath: "story/branch.inscape",
      text: "# Branch\nNarrator: Branch.",
    },
    {
      relativePath: "notes/readme.txt",
      text: "notes are not project script files",
    },
  ],
  selectedPathKind: "directory",
  workspaceName: "Court Loop",
  workspaceRoot,
});
assertEqual(workspaceFolder.openDecision.allowed, true, "desktop v0 smoke opens directory workspace");
assertEqual(workspaceFolder.documentCount, 2, "desktop v0 smoke lists workspace scripts");
assertEqual(workspaceFolder.rejectedDocuments[0].reason, "workspace-document-not-inscape", "desktop v0 smoke rejects non-script file");
assertNotIncludes(JSON.stringify(workspaceFolder), initialText, "desktop v0 smoke workspace summary hides text");

const documentBufferStore = new DocumentBufferStore({ sessionId: "desktop-v0-smoke" });
const store = documentBufferStore.buildStore({
  activeRelativePath,
  documents: [
    {
      active: true,
      existsOnDisk: true,
      relativePath: activeRelativePath,
      revision: 1,
      text: initialText,
    },
    {
      existsOnDisk: true,
      relativePath: "story/branch.inscape",
      revision: 1,
      text: "# Branch\nNarrator: Branch.",
    },
  ],
  workspaceName: "Court Loop",
});
assertEqual(store.documentCount, 2, "desktop v0 smoke buffer store document count");

const updateResult = documentBufferStore.updateDocument(store, {
  baseRevision: 1,
  relativePath: activeRelativePath,
  text: editedText,
});
assertEqual(updateResult.ok, true, "desktop v0 smoke edits active document");
assertEqual(updateResult.document.dirty, true, "desktop v0 smoke edited document is dirty");

const autosavePlan = documentBufferStore.buildAutosavePlan(updateResult.store, {
  debounceMs: 1000,
  idleElapsedMs: 1500,
  pendingWrites: [
    {
      relativePath: activeRelativePath,
      revision: updateResult.document.revision,
    },
  ],
});
assertEqual(autosavePlan.ready, true, "desktop v0 smoke autosave becomes ready after idle");
assertEqual(autosavePlan.saveRequests[0].baseRevision, updateResult.document.revision, "desktop v0 smoke autosave targets latest revision");
assertNotIncludes(JSON.stringify(autosavePlan), editedText, "desktop v0 smoke autosave plan hides text");

const manualSaveResult = documentBufferStore.saveDocumentToStore(updateResult.store, {
  baseRevision: updateResult.document.revision,
  relativePath: activeRelativePath,
  workspaceRoot,
});
assertEqual(manualSaveResult.ok, true, "desktop v0 smoke manual save succeeds");
assertEqual(manualSaveResult.saveStatus.state, "saved", "desktop v0 smoke manual save status");
assertEqual(manualSaveResult.document.dirty, false, "desktop v0 smoke manual save clears dirty summary");
assertNotIncludes(JSON.stringify(manualSaveResult), editedText, "desktop v0 smoke save result hides text");

const recoveryPlan = documentBufferStore.buildRecoverySnapshotPlan(updateResult.store, {
  diskModifiedUtcByPath: {
    [activeRelativePath]: "2026-06-17T00:00:00.000Z",
  },
  snapshotModifiedUtc: "2026-06-17T00:01:00.000Z",
  workspaceRoot,
});
assertEqual(recoveryPlan.snapshotWriteCount, 1, "desktop v0 smoke recovery snapshot planned for dirty edit");
assertEqual(recoveryPlan.snapshotWrites[0].text, editedText, "desktop v0 smoke recovery write carries backend text");
assertNotIncludes(JSON.stringify(recoveryPlan.recoveryStatus), editedText, "desktop v0 smoke recovery status hides text");

const projectSession = EditorBackendDesktopSessionModel.buildProjectSession({
  documents: updateResult.store.documents,
  recoveryStatus: recoveryPlan.recoveryStatus,
  sessionId: "desktop-v0-smoke",
  settingsSummary: documentBufferStore.buildSettingsSummary(),
  workspace: {
    activeRelativePath,
    workspaceName: "Court Loop",
    workspaceRoot,
  },
});
assertEqual(projectSession.mode, "embedded-desktop", "desktop v0 smoke project session mode");
assertEqual(projectSession.workspace.documentCount, 2, "desktop v0 smoke project session document count");
assertEqual(projectSession.recoveryStatus.state, "available", "desktop v0 smoke project session recovery available");
assertNotIncludes(JSON.stringify(projectSession), editedText, "desktop v0 smoke project session status hides text");

const workspaceSnapshot = documentBufferStore.buildWorkspaceSnapshot(updateResult.store, {
  activeRelativePath,
});
assertEqual(workspaceSnapshot.format, EditorBackendWorkspaceSnapshotFormat, "desktop v0 smoke workspace snapshot format");
assertEqual(workspaceSnapshot.activeRelativePath, activeRelativePath, "desktop v0 smoke workspace snapshot active path");
assertEqual(workspaceSnapshot.documents[0].text, editedText, "desktop v0 smoke backend snapshot carries active text");

const authoringCalls = [];
const languageSessionClient = {
  async completions(payload) {
    authoringCalls.push({ method: "completions", payload });
    return {
      completions: [
        {
          label: "Branch",
        },
      ],
    };
  },
  async diagnose(payload) {
    authoringCalls.push({ method: "diagnostics", payload });
    return {
      diagnostics: [],
    };
  },
};
const completionBridge = new SelfHostedEditorCompletionBridge({ languageSessionClient });
const diagnosticsBridge = new SelfHostedEditorDiagnosticsBridge({ languageSessionClient });
for (const bridge of [completionBridge, diagnosticsBridge]) {
  bridge.setWorkspaceSnapshotProvider(() => workspaceSnapshot);
  bridge.setWorkspaceContextProvider(() => ({
    currentFilePath: "legacy.inscape",
    documents: [
      {
        relativePath: "legacy.inscape",
        text: "legacy text",
      },
    ],
  }));
}
await diagnosticsBridge.getDiagnostics("legacy text");
await completionBridge.getCompletions("legacy text");
assertEqual(authoringCalls.length, 2, "desktop v0 smoke authoring call count");
for (const call of authoringCalls) {
  assertEqual(call.payload.workspace.format, EditorBackendWorkspaceSnapshotFormat, `desktop v0 smoke ${call.method} uses backend snapshot`);
  assertEqual(call.payload.activeRelativePath, activeRelativePath, `desktop v0 smoke ${call.method} active path`);
  assertEqual(call.payload.scriptText, editedText, `desktop v0 smoke ${call.method} active text`);
  assertNotIncludes(JSON.stringify(call.payload), "legacy text", `desktop v0 smoke ${call.method} ignores legacy context when snapshot exists`);
}

const runtimeCalls = [];
const runtimeBridge = new SelfHostedEditorRuntimeBridge({
  runtimeSessionClient: {
    sessionId: "desktop-v0-smoke-runtime",
    async startOrObserve(payload) {
      runtimeCalls.push({ method: "startOrObserve", payload });
      return {
        currentNode: {
          name: "Opening",
        },
      };
    },
    async step(payload) {
      runtimeCalls.push({ method: "step", payload });
      return {
        currentNode: {
          name: "Branch",
        },
      };
    },
  },
});
runtimeBridge.setWorkspaceSnapshotProvider(() => workspaceSnapshot);
runtimeBridge.setWorkspaceContextProvider(() => ({
  currentFilePath: "legacy.inscape",
  documents: [],
}));
await runtimeBridge.getRuntimeSnapshot("legacy text");
await runtimeBridge.stepRuntimeSnapshot("legacy text", {
  state: {
    currentNodeName: "Opening",
  },
}, {
  groupIndex: 0,
  optionIndex: 0,
  type: "choose",
});
assertEqual(runtimeCalls.length, 2, "desktop v0 smoke runtime call count");
assertEqual(runtimeCalls[0].payload.workspace.format, EditorBackendWorkspaceSnapshotFormat, "desktop v0 smoke preview runtime uses backend snapshot");
assertEqual(runtimeCalls[1].payload.action.type, "choose", "desktop v0 smoke preview choice click action");
assertEqual(runtimeCalls[1].payload.scriptText, editedText, "desktop v0 smoke preview choice uses active text");
assertNotIncludes(JSON.stringify(runtimeCalls), "legacy text", "desktop v0 smoke runtime ignores legacy context when snapshot exists");

console.log("SelfHostedEditor desktop v0 smoke ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text).includes(unexpected)) {
    throw new Error(`${label}: did not expect ${unexpected}`);
  }
}
