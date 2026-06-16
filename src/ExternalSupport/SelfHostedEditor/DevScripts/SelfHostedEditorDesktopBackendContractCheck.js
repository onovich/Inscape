import {
  EditorBackendDesktopModelFormatVersion,
  EditorBackendDesktopProjectSessionMode,
  EditorBackendDesktopSessionModel,
  EditorBackendRecoveryStatusFormat,
  EditorBackendSaveStatusFormat,
  EditorBackendSettingsSummaryFormat,
  EditorBackendWorkspaceFileBoundaryFormat,
  listEditorBackendAllowedWriteTargets,
} from "../Scripts/Backend/Models/EditorBackendDesktopSessionModel.js";
import {
  EditorBackendDocumentBufferFormat,
  EditorBackendDocumentBufferModel,
} from "../Scripts/Backend/Models/EditorBackendDocumentBufferModel.js";
import {
  EditorBackendDocumentBufferAutosavePlanFormat,
  EditorBackendDocumentBufferFlushPlanFormat,
  EditorBackendDocumentBufferRecoverySnapshotFormat,
  EditorBackendDocumentBufferRecoverySnapshotPlanFormat,
  EditorBackendDocumentBufferStoreFormat,
  EditorBackendDocumentBufferStoreModel,
  EditorBackendDocumentBufferListFormat,
  EditorBackendDocumentBufferSaveAllResultFormat,
  EditorBackendDocumentBufferSaveResultFormat,
} from "../Scripts/Backend/Models/EditorBackendDocumentBufferStoreModel.js";
import {
  EditorBackendSettingsDefaults,
  EditorBackendSettingsSchemaFormat,
  EditorBackendSettingsSchemaModel,
} from "../Scripts/Backend/Models/EditorBackendSettingsSchemaModel.js";
import {
  EditorBackendProjectSessionLifecycleFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionLifecycleModel.js";
import {
  EditorBackendProjectSessionFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionModel.js";
import {
  EditorBackendWorkspaceSessionCleanupFormat,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceSessionCleanupModel.js";
import {
  EditorBackendWorkspaceSnapshotFormat,
  EditorBackendWorkspaceSnapshotModel,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceSnapshotModel.js";

const directDocumentBuffer = EditorBackendDocumentBufferModel.buildBuffer({
  active: true,
  dirty: true,
  diskTextHash: "disk-hash",
  existsOnDisk: true,
  lastLoadedUtc: "2026-06-16T00:00:00.000Z",
  lastSavedRevision: 4,
  relativePath: "story\\opening.inscape",
  revision: 5,
  text: "secret draft text",
});
assertEqual(directDocumentBuffer.format, EditorBackendDocumentBufferFormat, "direct document buffer format");
assertEqual(directDocumentBuffer.formatVersion, EditorBackendDesktopModelFormatVersion, "direct document buffer format version");
assertEqual(directDocumentBuffer.relativePath, "story/opening.inscape", "direct document buffer relative path normalization");
assertEqual(directDocumentBuffer.lastSavedRevision, 4, "direct document buffer saved revision baseline");
assertEqual(directDocumentBuffer.text, "secret draft text", "direct document buffer owns text");
const directDocumentSummary = EditorBackendDocumentBufferModel.buildSummary(directDocumentBuffer);
assertEqual(directDocumentSummary.relativePath, "story/opening.inscape", "direct document summary relative path");
assertEqual(directDocumentSummary.lastSavedRevision, 4, "direct document summary saved revision baseline");
assertNotIncludes(JSON.stringify(directDocumentSummary), "secret draft text", "direct document summary must not expose text");

const documentBuffer = EditorBackendDesktopSessionModel.buildDocumentBuffer(directDocumentBuffer);
assertEqual(documentBuffer.format, EditorBackendDocumentBufferFormat, "document buffer format");
assertEqual(documentBuffer.formatVersion, EditorBackendDesktopModelFormatVersion, "document buffer format version");
assertEqual(documentBuffer.relativePath, "story/opening.inscape", "document buffer relative path normalization");
assertEqual(documentBuffer.revision, 5, "document buffer revision");
assertEqual(documentBuffer.dirty, true, "document buffer dirty state");
assertEqual(documentBuffer.lastSavedRevision, 4, "document buffer saved revision baseline");
assertEqual(documentBuffer.text, "secret draft text", "document buffer owns current text");

const documentSummary = EditorBackendDesktopSessionModel.buildDocumentBufferSummary(documentBuffer);
assertEqual(documentSummary.relativePath, "story/opening.inscape", "document summary relative path");
assertEqual(documentSummary.dirty, true, "document summary dirty state");
assertEqual(documentSummary.lastSavedRevision, 4, "document summary saved revision baseline");
assertNotIncludes(JSON.stringify(documentSummary), "secret draft text", "document summary must not expose text");

const bufferStore = EditorBackendDocumentBufferStoreModel.buildStore({
  activeRelativePath: "story/opening.inscape",
  documents: [
    documentBuffer,
    {
      dirty: false,
      existsOnDisk: true,
      relativePath: "story/branch.inscape",
      revision: 2,
      text: "secret branch buffer text",
    },
  ],
  revision: 3,
  sessionId: "buffer session!?",
  workspaceName: "Court Case",
});
assertEqual(bufferStore.format, EditorBackendDocumentBufferStoreFormat, "document buffer store format");
assertEqual(bufferStore.sessionId, "buffer-session--", "document buffer store session id");
assertEqual(bufferStore.workspaceName, "Court Case", "document buffer store workspace name");
assertEqual(bufferStore.activeRelativePath, "story/opening.inscape", "document buffer store active path");
assertEqual(bufferStore.documentCount, 2, "document buffer store count");
assertEqual(bufferStore.documents[0].active, true, "document buffer store marks active document");
assertEqual(bufferStore.revision, 5, "document buffer store revision follows highest document revision");
const bufferList = EditorBackendDocumentBufferStoreModel.listDocuments(bufferStore);
assertEqual(bufferList.format, EditorBackendDocumentBufferListFormat, "document buffer list format");
assertEqual(bufferList.documentCount, 2, "document buffer list count");
assertEqual(bufferList.payloadContentExposed, false, "document buffer list payload exposure flag");
assertNotIncludes(JSON.stringify(bufferList), "secret draft text", "document buffer list must not expose active document text");
assertNotIncludes(JSON.stringify(bufferList), "secret branch buffer text", "document buffer list must not expose secondary document text");
const getBufferResult = EditorBackendDocumentBufferStoreModel.getDocument(bufferStore, {
  relativePath: "story/opening.inscape",
});
assertEqual(getBufferResult.ok, true, "document buffer get ok");
assertEqual(getBufferResult.document.text, "secret draft text", "document buffer get returns text");
const missingBufferResult = EditorBackendDocumentBufferStoreModel.getDocument(bufferStore, {
  relativePath: "story/missing.inscape",
});
assertEqual(missingBufferResult.ok, false, "document buffer get missing rejected");
assertEqual(missingBufferResult.reason, "document-not-found", "document buffer get missing reason");
const updateBufferResult = EditorBackendDocumentBufferStoreModel.updateDocument(bufferStore, {
  baseRevision: documentBuffer.revision,
  relativePath: "story/opening.inscape",
  text: "secret updated buffer text",
});
assertEqual(updateBufferResult.ok, true, "document buffer update ok");
assertEqual(updateBufferResult.document.text, "secret updated buffer text", "document buffer update text");
assertEqual(updateBufferResult.document.revision, 6, "document buffer update increments revision above store");
assertEqual(updateBufferResult.document.dirty, true, "document buffer update dirty");
assertEqual(updateBufferResult.document.lastSavedRevision, 4, "document buffer update preserves clean baseline");
assertEqual(updateBufferResult.store.revision, 6, "document buffer update store revision");
assertNotIncludes(JSON.stringify(EditorBackendDocumentBufferStoreModel.listDocuments(updateBufferResult.store)), "secret updated buffer text", "updated list must not expose text");
const staleBufferUpdateResult = EditorBackendDocumentBufferStoreModel.updateDocument(updateBufferResult.store, {
  baseRevision: documentBuffer.revision,
  relativePath: "story/opening.inscape",
  text: "secret stale overwrite text",
});
assertEqual(staleBufferUpdateResult.ok, false, "document buffer stale update rejected");
assertEqual(staleBufferUpdateResult.reason, "stale-document-revision", "document buffer stale update reason");
assertEqual(staleBufferUpdateResult.baseRevision, 5, "document buffer stale update base revision");
assertEqual(staleBufferUpdateResult.currentRevision, 6, "document buffer stale update current revision");
assertNotIncludes(JSON.stringify(staleBufferUpdateResult), "secret stale overwrite text", "document buffer stale update must not echo rejected text");
assertNotIncludes(JSON.stringify(staleBufferUpdateResult), "secret updated buffer text", "document buffer stale update must not expose current text");
const saveBufferResult = EditorBackendDocumentBufferStoreModel.saveDocument(updateBufferResult.store, {
  baseRevision: updateBufferResult.document.revision,
  nextDiskTextHash: "disk-hash-updated",
  observedDiskTextHash: "disk-hash",
  relativePath: "story/opening.inscape",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(saveBufferResult.format, EditorBackendDocumentBufferSaveResultFormat, "document buffer save format");
assertEqual(saveBufferResult.ok, true, "document buffer save ok");
assertEqual(saveBufferResult.reason, "", "document buffer save reason");
assertEqual(saveBufferResult.savedRevision, updateBufferResult.document.revision, "document buffer save revision");
assertEqual(saveBufferResult.saveStatus.state, "saved", "document buffer save status");
assertEqual(saveBufferResult.saveStatus.dirty, false, "document buffer save clean status");
assertEqual(saveBufferResult.document.dirty, false, "document buffer save summary clean");
assertEqual(saveBufferResult.document.lastSavedRevision, updateBufferResult.document.revision, "document buffer save updates saved revision");
assertEqual(saveBufferResult.document.diskTextHash, "disk-hash-updated", "document buffer save updates disk baseline");
assertEqual(saveBufferResult.storeSummary.documents[0].dirty, false, "document buffer save store summary clean");
assertEqual(saveBufferResult.storeSummary.documents[0].lastSavedRevision, updateBufferResult.document.revision, "document buffer save store summary saved revision");
assertEqual(saveBufferResult.workspaceBoundary.allowed, true, "document buffer save boundary allowed");
assertEqual(saveBufferResult.writeTarget.targetKind, "inscape-document", "document buffer save target");
assertEqual(saveBufferResult.payloadContentExposed, false, "document buffer save payload exposure flag");
assertNotIncludes(JSON.stringify(saveBufferResult), "secret updated buffer text", "document buffer save result must not expose text");
const staleSaveBufferResult = EditorBackendDocumentBufferStoreModel.saveDocument(updateBufferResult.store, {
  baseRevision: documentBuffer.revision,
  relativePath: "story/opening.inscape",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(staleSaveBufferResult.ok, false, "document buffer stale save rejected");
assertEqual(staleSaveBufferResult.reason, "stale-document-revision", "document buffer stale save reason");
assertEqual(staleSaveBufferResult.saveStatus.state, "error", "document buffer stale save status");
assertNotIncludes(JSON.stringify(staleSaveBufferResult), "secret updated buffer text", "document buffer stale save must not expose current text");
const diskConflictSaveResult = EditorBackendDocumentBufferStoreModel.saveDocument(updateBufferResult.store, {
  baseRevision: updateBufferResult.document.revision,
  observedDiskTextHash: "disk-hash-external-update",
  relativePath: "story/opening.inscape",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(diskConflictSaveResult.ok, false, "document buffer disk conflict rejected");
assertEqual(diskConflictSaveResult.reason, "disk-conflict", "document buffer disk conflict reason");
assertEqual(diskConflictSaveResult.saveStatus.state, "error", "document buffer disk conflict status");
assertEqual(diskConflictSaveResult.diskConflict.expectedDiskTextHash, "disk-hash", "document buffer disk conflict expected hash");
assertEqual(diskConflictSaveResult.diskConflict.observedDiskTextHash, "disk-hash-external-update", "document buffer disk conflict observed hash");
assertNotIncludes(JSON.stringify(diskConflictSaveResult), "secret updated buffer text", "document buffer disk conflict must not expose current text");
const unsafeSaveStore = EditorBackendDocumentBufferStoreModel.buildStore({
  documents: [
    {
      dirty: true,
      relativePath: "story/tool.exe",
      revision: 1,
      text: "secret executable draft text",
    },
  ],
});
const unsafeSaveResult = EditorBackendDocumentBufferStoreModel.saveDocument(unsafeSaveStore, {
  baseRevision: 1,
  relativePath: "story/tool.exe",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(unsafeSaveResult.ok, false, "document buffer unsafe save rejected");
assertEqual(unsafeSaveResult.reason, "write-target-not-whitelisted", "document buffer unsafe save reason");
assertEqual(unsafeSaveResult.workspaceBoundary.allowed, false, "document buffer unsafe save boundary");
assertNotIncludes(JSON.stringify(unsafeSaveResult), "secret executable draft text", "document buffer unsafe save must not expose text");
const saveAllStore = EditorBackendDocumentBufferStoreModel.buildStore({
  documents: [
    {
      dirty: true,
      diskTextHash: "opening-save-all-hash",
      relativePath: "story/opening.inscape",
      revision: 6,
      text: "secret save all opening text",
    },
    {
      dirty: true,
      diskTextHash: "branch-save-all-hash",
      relativePath: "story/branch.inscape",
      revision: 4,
      text: "secret save all branch text",
    },
  ],
});
const saveAllResult = EditorBackendDocumentBufferStoreModel.saveAll(saveAllStore, {
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(saveAllResult.format, EditorBackendDocumentBufferSaveAllResultFormat, "document buffer save all format");
assertEqual(saveAllResult.ok, true, "document buffer save all ok");
assertEqual(saveAllResult.savedCount, 2, "document buffer save all count");
assertEqual(saveAllResult.failedCount, 0, "document buffer save all failed count");
assertEqual(saveAllResult.saveStatus.state, "saved", "document buffer save all status");
assertEqual(saveAllResult.storeSummary.documents.every((document) => !document.dirty), true, "document buffer save all store summary clean");
assertEqual(saveAllResult.storeSummary.documents[0].lastSavedRevision, 6, "document buffer save all first saved revision");
assertEqual(saveAllResult.storeSummary.documents[1].lastSavedRevision, 4, "document buffer save all second saved revision");
assertEqual(saveAllResult.payloadContentExposed, false, "document buffer save all payload exposure flag");
assertNotIncludes(JSON.stringify(saveAllResult), "secret save all opening text", "document buffer save all must not expose opening text");
assertNotIncludes(JSON.stringify(saveAllResult), "secret save all branch text", "document buffer save all must not expose branch text");
const unsafeSaveAllResult = EditorBackendDocumentBufferStoreModel.saveAll(unsafeSaveStore, {
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(unsafeSaveAllResult.ok, false, "document buffer unsafe save all rejected");
assertEqual(unsafeSaveAllResult.reason, "one-or-more-documents-failed", "document buffer unsafe save all reason");
assertEqual(unsafeSaveAllResult.failedCount, 1, "document buffer unsafe save all failed count");
assertNotIncludes(JSON.stringify(unsafeSaveAllResult), "secret executable draft text", "document buffer unsafe save all must not expose text");
const autosaveStore = EditorBackendDocumentBufferStoreModel.buildStore({
  documents: [
    {
      dirty: true,
      lastSavedRevision: 6,
      relativePath: "story/opening.inscape",
      revision: 8,
      text: "secret autosave latest text",
    },
    {
      dirty: false,
      relativePath: "story/clean.inscape",
      revision: 3,
      text: "secret clean autosave text",
    },
  ],
});
const autosaveReadyPlan = EditorBackendDocumentBufferStoreModel.buildAutosavePlan(autosaveStore, {
  debounceMs: 1500,
  idleElapsedMs: 1800,
  pendingWrites: [
    {
      relativePath: "story/opening.inscape",
      revision: 7,
    },
  ],
});
assertEqual(autosaveReadyPlan.format, EditorBackendDocumentBufferAutosavePlanFormat, "autosave plan format");
assertEqual(autosaveReadyPlan.ready, true, "autosave plan ready");
assertEqual(autosaveReadyPlan.saveRequests.length, 1, "autosave plan save request count");
assertEqual(autosaveReadyPlan.saveRequests[0].baseRevision, 8, "autosave plan uses latest revision");
assertEqual(autosaveReadyPlan.saveRequests[0].lastSavedRevision, 6, "autosave plan preserves saved baseline");
assertEqual(autosaveReadyPlan.skippedWrites[0].reason, "stale-autosave-revision", "autosave plan skips stale pending write");
assertEqual(autosaveReadyPlan.skippedWrites[0].documentRevision, 7, "autosave plan stale pending revision");
assertEqual(autosaveReadyPlan.payloadContentExposed, false, "autosave plan payload exposure flag");
assertNotIncludes(JSON.stringify(autosaveReadyPlan), "secret autosave latest text", "autosave plan must not expose dirty text");
assertNotIncludes(JSON.stringify(autosaveReadyPlan), "secret clean autosave text", "autosave plan must not expose clean text");
const autosaveWaitingPlan = EditorBackendDocumentBufferStoreModel.buildAutosavePlan(autosaveStore, {
  debounceMs: 1500,
  idleElapsedMs: 200,
});
assertEqual(autosaveWaitingPlan.ready, false, "autosave waiting plan not ready");
assertEqual(autosaveWaitingPlan.saveRequests.length, 0, "autosave waiting plan no save requests");
assertEqual(autosaveWaitingPlan.skippedWrites[0].reason, "debounce-waiting", "autosave waiting plan reason");
const autosaveDisabledPlan = EditorBackendDocumentBufferStoreModel.buildAutosavePlan(autosaveStore, {
  autosaveEnabled: false,
  debounceMs: 1500,
  idleElapsedMs: 1800,
});
assertEqual(autosaveDisabledPlan.autosaveEnabled, false, "autosave disabled plan flag");
assertEqual(autosaveDisabledPlan.saveRequests.length, 0, "autosave disabled plan no save requests");
assertEqual(autosaveDisabledPlan.skippedWrites[0].reason, "autosave-disabled", "autosave disabled plan reason");
const flushStore = EditorBackendDocumentBufferStoreModel.buildStore({
  documents: [
    {
      dirty: true,
      lastSavedRevision: 6,
      relativePath: "story/opening.inscape",
      revision: 9,
      text: "secret flush latest text",
    },
    {
      dirty: false,
      relativePath: "story/clean.inscape",
      revision: 3,
      text: "secret clean flush text",
    },
  ],
});
for (const trigger of ["manual-save", "close-window", "switch-workspace", "app-exit"]) {
  const flushPlan = EditorBackendDocumentBufferStoreModel.buildFlushPlan(flushStore, {
    trigger,
    workspaceRoot: "C:/Case Files/Court Loop",
  });
  assertEqual(flushPlan.format, EditorBackendDocumentBufferFlushPlanFormat, `flush plan format ${trigger}`);
  assertEqual(flushPlan.trigger, trigger, `flush plan trigger ${trigger}`);
  assertEqual(flushPlan.continuationBlocked, true, `flush plan blocks continuation ${trigger}`);
  assertEqual(flushPlan.flushRequestCount, 1, `flush plan request count ${trigger}`);
  assertEqual(flushPlan.flushRequests[0].baseRevision, 9, `flush plan latest revision ${trigger}`);
  assertEqual(flushPlan.flushRequests[0].lastSavedRevision, 6, `flush plan saved baseline ${trigger}`);
  assertEqual(flushPlan.flushRequests[0].required, true, `flush plan required flag ${trigger}`);
  assertEqual(flushPlan.flushRequests[0].writeTarget.targetKind, "inscape-document", `flush plan write target ${trigger}`);
  assertEqual(flushPlan.uiVisibility.state, "flush-required", `flush plan UI state ${trigger}`);
  assertEqual(flushPlan.payloadContentExposed, false, `flush plan payload exposure ${trigger}`);
  assertNotIncludes(JSON.stringify(flushPlan), "secret flush latest text", `flush plan must not expose dirty text ${trigger}`);
  assertNotIncludes(JSON.stringify(flushPlan), "secret clean flush text", `flush plan must not expose clean text ${trigger}`);
}
const failedFlushPlan = EditorBackendDocumentBufferStoreModel.buildFlushPlan(flushStore, {
  saveResults: [
    {
      currentRevision: 9,
      ok: false,
      reason: "disk-conflict",
      relativePath: "story/opening.inscape",
      saveStatus: {
        lastError: {
          code: "disk-conflict",
          message: "secret disk failure payload",
        },
        relativePath: "story/opening.inscape",
        revision: 9,
      },
    },
  ],
  trigger: "app-exit",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(failedFlushPlan.failedCount, 1, "flush plan failed count");
assertEqual(failedFlushPlan.visibleFailures[0].reason, "disk-conflict", "flush plan visible failure reason");
assertEqual(failedFlushPlan.uiVisibility.state, "save-error-visible", "flush plan failure UI state");
assertEqual(failedFlushPlan.uiVisibility.requiresUserAction, true, "flush plan failure requires user action");
assertNotIncludes(JSON.stringify(failedFlushPlan), "secret disk failure payload", "flush plan failure must not echo error payload");
assertNotIncludes(JSON.stringify(failedFlushPlan), "secret flush latest text", "flush plan failure must not expose text");
const blockedFlushPlan = EditorBackendDocumentBufferStoreModel.buildFlushPlan(unsafeSaveStore, {
  trigger: "switch-workspace",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(blockedFlushPlan.flushRequestCount, 0, "flush plan unsafe request count");
assertEqual(blockedFlushPlan.blockingIssues[0].reason, "write-target-not-whitelisted", "flush plan unsafe reason");
assertEqual(blockedFlushPlan.uiVisibility.state, "flush-blocked-visible", "flush plan unsafe UI state");
assertEqual(blockedFlushPlan.continuationBlocked, true, "flush plan unsafe blocks continuation");
assertNotIncludes(JSON.stringify(blockedFlushPlan), "secret executable draft text", "flush plan unsafe must not expose text");
const recoverySnapshotPlan = EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan(flushStore, {
  diskModifiedUtcByPath: {
    "story/opening.inscape": "2026-06-16T00:59:00.000Z",
  },
  snapshotModifiedUtc: "2026-06-16T01:00:00.000Z",
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(recoverySnapshotPlan.format, EditorBackendDocumentBufferRecoverySnapshotPlanFormat, "recovery snapshot plan format");
assertEqual(recoverySnapshotPlan.snapshotWriteCount, 1, "recovery snapshot plan write count");
assertEqual(recoverySnapshotPlan.payloadContentExposed, true, "recovery snapshot plan exposes backend payload");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].format, EditorBackendDocumentBufferRecoverySnapshotFormat, "recovery snapshot format");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].relativePath, "story/opening.inscape", "recovery snapshot source path");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].documentRevision, 9, "recovery snapshot revision");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].diskModifiedUtc, "2026-06-16T00:59:00.000Z", "recovery snapshot disk mtime");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].snapshotModifiedUtc, "2026-06-16T01:00:00.000Z", "recovery snapshot mtime");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].snapshotRelativePath, ".inscape-workspace/recovery/story/opening.inscape.snapshot.json", "recovery snapshot path");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].writeTarget.targetKind, "recovery-snapshot", "recovery snapshot write target");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].text, "secret flush latest text", "recovery snapshot carries backend text payload");
assertEqual(recoverySnapshotPlan.snapshotWrites[0].contentHash.startsWith("fnv1a32:"), true, "recovery snapshot content hash");
assertEqual(recoverySnapshotPlan.recoveryStatus.items[0].contentHash, recoverySnapshotPlan.snapshotWrites[0].contentHash, "recovery snapshot status hash");
assertNotIncludes(JSON.stringify(recoverySnapshotPlan.recoveryStatus), "secret flush latest text", "recovery status must not expose snapshot text");
assertNotIncludes(JSON.stringify(recoverySnapshotPlan.storeSummary), "secret flush latest text", "recovery plan store summary must not expose text");
const recoveryCleanupStore = EditorBackendDocumentBufferStoreModel.buildStore({
  documents: [
    {
      dirty: false,
      lastSavedRevision: 9,
      relativePath: "story/opening.inscape",
      revision: 9,
      text: "secret saved recovery text",
    },
  ],
});
const recoveryCleanupPlan = EditorBackendDocumentBufferStoreModel.buildRecoverySnapshotPlan(recoveryCleanupStore, {
  saveResults: [
    {
      ok: true,
      relativePath: "story/opening.inscape",
      savedRevision: 9,
    },
  ],
  workspaceRoot: "C:/Case Files/Court Loop",
});
assertEqual(recoveryCleanupPlan.snapshotWriteCount, 0, "recovery cleanup plan no snapshot writes");
assertEqual(recoveryCleanupPlan.payloadContentExposed, false, "recovery cleanup plan text-free");
assertEqual(recoveryCleanupPlan.cleanupRequests.length, 1, "recovery cleanup request count");
assertEqual(recoveryCleanupPlan.cleanupRequests[0].reason, "saved-document-recovery-cleanup", "recovery cleanup reason");
assertEqual(recoveryCleanupPlan.cleanupRequests[0].writeTarget.targetKind, "recovery-snapshot", "recovery cleanup target");
assertNotIncludes(JSON.stringify(recoveryCleanupPlan), "secret saved recovery text", "recovery cleanup plan must not expose text");
const activeBufferResult = EditorBackendDocumentBufferStoreModel.setActiveDocument(updateBufferResult.store, {
  relativePath: "story/branch.inscape",
});
assertEqual(activeBufferResult.ok, true, "document buffer set active ok");
assertEqual(activeBufferResult.store.activeRelativePath, "story/branch.inscape", "document buffer set active path");
assertEqual(activeBufferResult.document.active, true, "document buffer set active document flag");
const workspaceSnapshot = EditorBackendWorkspaceSnapshotModel.buildSnapshot({
  store: activeBufferResult.store,
});
assertEqual(workspaceSnapshot.format, EditorBackendWorkspaceSnapshotFormat, "workspace snapshot format");
assertEqual(workspaceSnapshot.source, "backend-buffer-store", "workspace snapshot source");
assertEqual(workspaceSnapshot.currentFilePath, "story/branch.inscape", "workspace snapshot active path");
assertEqual(workspaceSnapshot.documentCount, 2, "workspace snapshot document count");
assertEqual(workspaceSnapshot.documentRevision, 2, "workspace snapshot active document revision");
assertEqual(workspaceSnapshot.revision, 6, "workspace snapshot store revision");
assertEqual(workspaceSnapshot.payloadContentExposed, true, "workspace snapshot payload exposure flag");
assertEqual(workspaceSnapshot.documents[0].text, "secret updated buffer text", "workspace snapshot includes current buffer text");
assertEqual(workspaceSnapshot.documents[1].text, "secret branch buffer text", "workspace snapshot includes secondary buffer text");
const activeDocumentRequest = EditorBackendWorkspaceSnapshotModel.buildActiveDocumentRequest(workspaceSnapshot);
assertEqual(activeDocumentRequest.activeRelativePath, "story/branch.inscape", "workspace snapshot active request path");
assertEqual(activeDocumentRequest.documentRevision, 2, "workspace snapshot active request revision");
assertEqual(activeDocumentRequest.scriptText, "secret branch buffer text", "workspace snapshot active request text");
assertEqual(activeDocumentRequest.workspace.format, EditorBackendWorkspaceSnapshotFormat, "workspace snapshot active request workspace");
const openingSnapshot = EditorBackendWorkspaceSnapshotModel.buildSnapshot({
  activeRelativePath: "story/opening.inscape",
  store: activeBufferResult.store,
});
assertEqual(openingSnapshot.currentFilePath, "story/opening.inscape", "workspace snapshot active override path");
assertEqual(openingSnapshot.documentRevision, 6, "workspace snapshot active override revision");
const missingActiveResult = EditorBackendDocumentBufferStoreModel.setActiveDocument(updateBufferResult.store, {
  relativePath: "story/missing.inscape",
});
assertEqual(missingActiveResult.ok, false, "document buffer set active missing rejected");
assertEqual(missingActiveResult.reason, "document-not-found", "document buffer set active missing reason");

const session = EditorBackendDesktopSessionModel.buildProjectSession({
  documents: [
    documentBuffer,
    {
      dirty: false,
      existsOnDisk: true,
      relativePath: "story/branch.inscape",
      revision: 3,
      text: "secret branch text",
    },
  ],
  recoveryStatus: {
    items: [
      {
        contentHash: "recovery-hash",
        diskModifiedUtc: "2026-06-15T23:58:00.000Z",
        relativePath: "story/opening.inscape",
        revision: 6,
        snapshotModifiedUtc: "2026-06-16T00:01:00.000Z",
        text: "secret recovery text",
      },
    ],
  },
  saveStatus: {
    dirty: true,
    relativePath: "story/opening.inscape",
    revision: 5,
  },
  sessionId: "desktop session!? 01",
  settingsSummary: {
    globalSettings: {
      autosaveEnabled: true,
      backupRetentionDays: 14,
      backupRetentionLimit: 8,
      defaultAssetDirectory: "assets",
      theme: "system",
    },
    workspaceSettings: {
      backupEnabled: true,
      entryTitle: "Opening",
      exportProfile: "internal",
      gitCheckpointPolicy: "manual",
      resourceDirectory: "assets",
      resourceImportPolicy: "copy-into-workspace",
    },
  },
  workspace: {
    activeRelativePath: "story/opening.inscape",
    revision: 5,
    workspaceName: "Court Case",
    workspaceRoot: "C:\\Case Files\\Court Loop",
  },
  windowId: "main window!? 01",
});
assertEqual(session.format, EditorBackendProjectSessionFormat, "desktop project session format");
assertEqual(session.mode, EditorBackendDesktopProjectSessionMode, "desktop project session mode");
assertEqual(session.sessionId, "desktop-session---01", "desktop project session id normalization");
assertEqual(session.lifecycle.format, EditorBackendProjectSessionLifecycleFormat, "desktop lifecycle format");
assertEqual(session.lifecycle.ownership, "single-window-active-session", "desktop lifecycle ownership");
assertEqual(session.lifecycle.windowId, "main-window---01", "desktop lifecycle window id normalization");
assertEqual(session.lifecycle.sessionId, "desktop-session---01", "desktop lifecycle session id");
assertEqual(session.lifecycle.workspaceRoot, "C:/Case Files/Court Loop", "desktop lifecycle workspace root");
assertEqual(session.lifecycle.activeRelativePath, "story/opening.inscape", "desktop lifecycle active document");
assertEqual(session.lifecycle.documentCount, 2, "desktop lifecycle document count");
assertEqual(session.lifecycle.revision, 5, "desktop lifecycle revision");
assertEqual(session.lifecycle.mode, EditorBackendDesktopProjectSessionMode, "desktop lifecycle mode");
assertEqual(session.lifecycle.active, true, "desktop lifecycle active flag");
assertEqual(session.workspace.source, "backend-buffer-store", "desktop project session workspace source");
assertEqual(session.workspace.workspaceName, "Court Case", "desktop project session workspace name");
assertEqual(session.workspace.workspaceRoot, "C:/Case Files/Court Loop", "desktop project session workspace root");
assertEqual(session.workspace.activeRelativePath, "story/opening.inscape", "desktop project session active document");
assertEqual(session.workspace.documentCount, 2, "desktop project session document count");
assertEqual(session.workspace.revision, 5, "desktop project session revision");
assertEqual(session.workspace.hasUnsavedChanges, true, "desktop project session dirty summary");
assertEqual(session.languageSession.kind, "process-per-request", "desktop project session keeps process-per-request default");
assertEqual(
  session.languageSession.supportedEndpoints.join(","),
  "diagnostics,completions,definition,references,hover,document-symbols",
  "desktop project session language endpoints"
);
assertEqual(session.runtimeSession.kind, "not-started", "desktop runtime session default kind");
assertEqual(session.lineIdentitySession.kind, "not-started", "desktop line identity session default kind");
assertEqual(session.localizationSession.kind, "not-started", "desktop localization session default kind");
assertEqual(session.saveStatus.format, EditorBackendSaveStatusFormat, "desktop save status format");
assertEqual(session.saveStatus.state, "dirty", "desktop save status dirty state");
assertEqual(session.recoveryStatus.format, EditorBackendRecoveryStatusFormat, "desktop recovery status format");
assertEqual(session.recoveryStatus.state, "available", "desktop recovery available state");
assertEqual(session.settingsSummary.format, EditorBackendSettingsSummaryFormat, "desktop settings summary format");
assertEqual(session.settingsSummary.global.autosaveEnabled, true, "desktop settings autosave default");
assertEqual(session.settingsSummary.workspace.resourceImportPolicy, "copy-into-workspace", "desktop settings resource policy");
assertNotIncludes(JSON.stringify(session), "secret draft text", "desktop project session status must not expose document text");
assertNotIncludes(JSON.stringify(session), "secret branch text", "desktop project session status must not expose secondary document text");
assertNotIncludes(JSON.stringify(session), "secret recovery text", "desktop project session status must not expose recovery text");
assertNotIncludes(JSON.stringify(session), "long-lived", "desktop P1 contract must not claim default long-lived LanguageServer");

const allowedBoundaries = [
  ["story/opening.inscape", "inscape-document"],
  ["localization/zh-cn.csv", "localization-csv"],
  ["inscape.node-map.json", "node-map-sidecar"],
  ["metadata/inscape.line-map.json", "line-map-sidecar"],
  [".inscape-workspace/recovery/opening.snapshot.json", "recovery-snapshot"],
  [".inscape-workspace/backups/localization/zh-cn.csv.20260616.bak", "backup-artifact"],
  [".inscape-workspace/cache/preview.json", "cache-artifact"],
  ["assets/images/cg.png", "asset-copy"],
];
for (const [relativePath, expectedTargetKind] of allowedBoundaries) {
  const boundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
    operation: "write",
    relativePath,
    workspaceRoot: "C:/Case Files/Court Loop",
  });
  assertEqual(boundary.format, EditorBackendWorkspaceFileBoundaryFormat, `workspace boundary format: ${relativePath}`);
  assertEqual(boundary.allowed, true, `workspace boundary allowed: ${relativePath}`);
  assertEqual(boundary.workspaceRelative, true, `workspace boundary relative: ${relativePath}`);
  assertEqual(boundary.withinWorkspace, true, `workspace boundary inside root: ${relativePath}`);
  assertEqual(boundary.writeTarget.allowed, true, `workspace boundary write target allowed: ${relativePath}`);
  assertEqual(boundary.writeTarget.targetKind, expectedTargetKind, `workspace boundary write target kind: ${relativePath}`);
  assertEqual(
    boundary.resolvedWorkspacePath,
    `C:/Case Files/Court Loop/${relativePath}`,
    `workspace boundary resolved path: ${relativePath}`
  );
  assertEqual(boundary.targetKind, expectedTargetKind, `workspace boundary target kind: ${relativePath}`);
}

const rejectedBoundaries = [
  ["", "empty-relative-path"],
  ["../escape.inscape", "path-traversal-rejected"],
  ["story/../escape.inscape", "path-traversal-rejected"],
  ["C:/escape.inscape", "absolute-path-rejected"],
  ["C:\\escape.inscape", "absolute-path-rejected"],
  ["/escape.inscape", "absolute-path-rejected"],
  ["file:///escape.inscape", "absolute-path-rejected"],
  ["story/tool.exe", "write-target-not-whitelisted"],
];
for (const [relativePath, expectedReason] of rejectedBoundaries) {
  const boundary = EditorBackendDesktopSessionModel.buildWorkspaceFileBoundary({
    operation: "write",
    relativePath,
    workspaceRoot: "C:/Case Files/Court Loop",
  });
  assertEqual(boundary.allowed, false, `workspace boundary rejected: ${relativePath}`);
  assertEqual(boundary.workspaceRelative, false, `workspace boundary rejected relative flag: ${relativePath}`);
  assertEqual(boundary.reason, expectedReason, `workspace boundary rejection reason: ${relativePath}`);
}

const saveError = EditorBackendDesktopSessionModel.buildSaveStatus({
  lastError: {
    code: "EWRITE",
    message: "Write failed because disk is unavailable",
  },
  relativePath: "story/opening.inscape",
  revision: 8,
});
assertEqual(saveError.state, "error", "save status error state");
assertEqual(saveError.lastError.code, "EWRITE", "save status error code");
assertNotIncludes(JSON.stringify(saveError), "stack", "save status should not expose stack details");

const emptyRecovery = EditorBackendDesktopSessionModel.buildRecoveryStatus();
assertEqual(emptyRecovery.state, "none", "empty recovery status");
assertEqual(emptyRecovery.items.length, 0, "empty recovery items");

const defaultSettings = EditorBackendDesktopSessionModel.buildSettingsSummary();
assertEqual(defaultSettings.global.autosaveEnabled, true, "default settings autosave enabled");
assertEqual(defaultSettings.workspace.backupEnabled, true, "default settings backup enabled");
assertEqual(defaultSettings.workspace.resourceDirectory, "assets", "default settings resource directory");
assertEqual(defaultSettings.global.backupRetentionLimit, EditorBackendSettingsDefaults.global.backupRetentionLimit, "default settings retention limit");

const sanitizedSettings = EditorBackendDesktopSessionModel.buildSettingsSummary({
  globalSettings: {
    autosaveEnabled: false,
    backupRetentionDays: -1,
    backupRetentionLimit: 0,
    defaultAssetDirectory: "../outside",
    theme: "neon",
  },
  workspaceSettings: {
    backupEnabled: false,
    gitCheckpointPolicy: "auto",
    resourceDirectory: "resources",
    resourceImportPolicy: "reference-external",
  },
});
assertEqual(sanitizedSettings.global.autosaveEnabled, false, "settings autosave can be disabled");
assertEqual(sanitizedSettings.global.backupRetentionDays, EditorBackendSettingsDefaults.global.backupRetentionDays, "settings invalid retention days fallback");
assertEqual(sanitizedSettings.global.backupRetentionLimit, EditorBackendSettingsDefaults.global.backupRetentionLimit, "settings invalid retention limit fallback");
assertEqual(sanitizedSettings.global.defaultAssetDirectory, "assets", "settings invalid default asset directory fallback");
assertEqual(sanitizedSettings.global.theme, "system", "settings invalid theme fallback");
assertEqual(sanitizedSettings.workspace.backupEnabled, false, "settings backup can be disabled");
assertEqual(sanitizedSettings.workspace.gitCheckpointPolicy, "manual", "settings invalid git policy fallback");
assertEqual(sanitizedSettings.workspace.resourceDirectory, "assets", "settings invalid resource directory fallback");
assertEqual(sanitizedSettings.workspace.resourceImportPolicy, "reference-external", "settings unsupported resource import policy remains explicit");

const settingsSchema = EditorBackendSettingsSchemaModel.buildSchema({
  settingsSummary: sanitizedSettings,
});
assertEqual(settingsSchema.format, EditorBackendSettingsSchemaFormat, "settings schema format");
assertEqual(settingsSchema.payloadContentExposed, false, "settings schema text-free");
assertEqual(settingsSchema.schemaCompleteForP1, true, "settings schema complete for P1");
assertEqual(settingsSchema.settingCount, 11, "settings schema setting count");
assertEqual(settingsSchema.scopes.map((scope) => scope.scope).join(","), "global,workspace", "settings schema scopes");
assertEqual(settingsSchema.scopes[0].owner, "user-preference", "settings global owner");
assertEqual(settingsSchema.scopes[0].projectBehavior, false, "settings global project behavior flag");
assertEqual(settingsSchema.scopes[1].owner, "project-behavior", "settings workspace owner");
assertEqual(settingsSchema.scopes[1].projectBehavior, true, "settings workspace project behavior flag");
const backupRetentionLimitSetting = settingsSchema.scopes[0].settings.find((setting) => setting.key === "backupRetentionLimit");
assertEqual(backupRetentionLimitSetting.minimum, 1, "settings schema backup retention minimum");
assertEqual(backupRetentionLimitSetting.defaultValue, 20, "settings schema backup retention default");
const resourceDirectorySetting = settingsSchema.scopes[1].settings.find((setting) => setting.key === "resourceDirectory");
assertEqual(resourceDirectorySetting.pathRule, "assets/**", "settings schema resource directory path rule");
const resourceImportPolicySetting = settingsSchema.scopes[1].settings.find((setting) => setting.key === "resourceImportPolicy");
assertEqual(resourceImportPolicySetting.allowedValues.join(","), "copy-into-workspace,reference-external", "settings schema resource policy allowed values");
assertEqual(resourceImportPolicySetting.supportedValues.join(","), "copy-into-workspace", "settings schema resource policy P1 supported values");
assertEqual(settingsSchema.settingsSummary.workspace.resourceImportPolicy, "reference-external", "settings schema preserves explicit unsupported resource policy");
assertNotIncludes(JSON.stringify(settingsSchema), "secret", "settings schema must not expose document-like payload content");

const cleanupSummary = EditorBackendDesktopSessionModel.buildWorkspaceSessionCleanupSummary({
  cacheCounts: {
    lineMapSidecars: 2,
    localizationBaselines: 3,
    runtimeSnapshots: 1,
    temporaryWorkspaceFiles: 5,
  },
  operation: "switch-workspace",
  sessionId: "desktop session!? 01",
  workspaceRoot: "C:\\Case Files\\Court Loop",
});
assertEqual(cleanupSummary.format, EditorBackendWorkspaceSessionCleanupFormat, "workspace cleanup format");
assertEqual(cleanupSummary.operation, "switch-workspace", "workspace cleanup operation");
assertEqual(cleanupSummary.sessionId, "desktop-session---01", "workspace cleanup session id");
assertEqual(cleanupSummary.workspaceRoot, "C:/Case Files/Court Loop", "workspace cleanup root");
assertEqual(cleanupSummary.payloadContentExposed, false, "workspace cleanup payload exposure flag");
assertEqual(cleanupSummary.targetCount, 5, "workspace cleanup target count");
assertEqual(
  cleanupSummary.targets.map((target) => `${target.kind}:${target.action}`).join(","),
  "language-session:clear,runtime-session:clear,line-identity-session:clear,localization-session:clear,temporary-workspace:clear",
  "workspace cleanup targets"
);
assertEqual(cleanupSummary.cacheCounts.runtimeSnapshots, 1, "workspace cleanup runtime count");
assertEqual(cleanupSummary.cacheCounts.lineMapSidecars, 2, "workspace cleanup line-map count");
assertEqual(cleanupSummary.cacheCounts.localizationBaselines, 3, "workspace cleanup localization count");
assertEqual(cleanupSummary.cacheCounts.temporaryWorkspaceFiles, 5, "workspace cleanup temp file count");
assertNotIncludes(JSON.stringify(cleanupSummary), "secret", "workspace cleanup summary must not expose cached payload content");

assertEqual(
  listEditorBackendAllowedWriteTargets().join(","),
  "recovery-snapshot,backup-artifact,cache-artifact,asset-copy,inscape-document,localization-csv,node-map-sidecar,line-map-sidecar",
  "desktop allowed write target catalog"
);

console.log("SelfHostedEditor desktop backend contract ok");

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
