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
  EditorBackendDocumentBufferStoreFormat,
  EditorBackendDocumentBufferStoreModel,
  EditorBackendDocumentBufferListFormat,
} from "../Scripts/Backend/Models/EditorBackendDocumentBufferStoreModel.js";
import {
  EditorBackendProjectSessionLifecycleFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionLifecycleModel.js";
import {
  EditorBackendProjectSessionFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionModel.js";
import {
  EditorBackendWorkspaceSessionCleanupFormat,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceSessionCleanupModel.js";

const directDocumentBuffer = EditorBackendDocumentBufferModel.buildBuffer({
  active: true,
  dirty: true,
  diskTextHash: "disk-hash",
  existsOnDisk: true,
  lastLoadedUtc: "2026-06-16T00:00:00.000Z",
  relativePath: "story\\opening.inscape",
  revision: 5,
  text: "secret draft text",
});
assertEqual(directDocumentBuffer.format, EditorBackendDocumentBufferFormat, "direct document buffer format");
assertEqual(directDocumentBuffer.formatVersion, EditorBackendDesktopModelFormatVersion, "direct document buffer format version");
assertEqual(directDocumentBuffer.relativePath, "story/opening.inscape", "direct document buffer relative path normalization");
assertEqual(directDocumentBuffer.text, "secret draft text", "direct document buffer owns text");
const directDocumentSummary = EditorBackendDocumentBufferModel.buildSummary(directDocumentBuffer);
assertEqual(directDocumentSummary.relativePath, "story/opening.inscape", "direct document summary relative path");
assertNotIncludes(JSON.stringify(directDocumentSummary), "secret draft text", "direct document summary must not expose text");

const documentBuffer = EditorBackendDesktopSessionModel.buildDocumentBuffer(directDocumentBuffer);
assertEqual(documentBuffer.format, EditorBackendDocumentBufferFormat, "document buffer format");
assertEqual(documentBuffer.formatVersion, EditorBackendDesktopModelFormatVersion, "document buffer format version");
assertEqual(documentBuffer.relativePath, "story/opening.inscape", "document buffer relative path normalization");
assertEqual(documentBuffer.revision, 5, "document buffer revision");
assertEqual(documentBuffer.dirty, true, "document buffer dirty state");
assertEqual(documentBuffer.text, "secret draft text", "document buffer owns current text");

const documentSummary = EditorBackendDesktopSessionModel.buildDocumentBufferSummary(documentBuffer);
assertEqual(documentSummary.relativePath, "story/opening.inscape", "document summary relative path");
assertEqual(documentSummary.dirty, true, "document summary dirty state");
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
  relativePath: "story/opening.inscape",
  text: "secret updated buffer text",
});
assertEqual(updateBufferResult.ok, true, "document buffer update ok");
assertEqual(updateBufferResult.document.text, "secret updated buffer text", "document buffer update text");
assertEqual(updateBufferResult.document.revision, 6, "document buffer update increments revision above store");
assertEqual(updateBufferResult.document.dirty, true, "document buffer update dirty");
assertEqual(updateBufferResult.store.revision, 6, "document buffer update store revision");
assertNotIncludes(JSON.stringify(EditorBackendDocumentBufferStoreModel.listDocuments(updateBufferResult.store)), "secret updated buffer text", "updated list must not expose text");
const activeBufferResult = EditorBackendDocumentBufferStoreModel.setActiveDocument(updateBufferResult.store, {
  relativePath: "story/branch.inscape",
});
assertEqual(activeBufferResult.ok, true, "document buffer set active ok");
assertEqual(activeBufferResult.store.activeRelativePath, "story/branch.inscape", "document buffer set active path");
assertEqual(activeBufferResult.document.active, true, "document buffer set active document flag");
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
  "inscape-document,localization-csv,node-map-sidecar,line-map-sidecar,recovery-snapshot,backup-artifact,cache-artifact,asset-copy",
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
