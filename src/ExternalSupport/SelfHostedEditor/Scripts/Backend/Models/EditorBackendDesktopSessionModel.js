import {
  EditorBackendProjectSessionFormat,
  EditorBackendProjectSessionFormatVersion,
} from "./EditorBackendProjectSessionModel.js";
import { EditorBackendWorkspacePathModel } from "./EditorBackendWorkspacePathModel.js";
import { EditorBackendWorkspaceWriteTargetModel } from "./EditorBackendWorkspaceWriteTargetModel.js";

export const EditorBackendDesktopProjectSessionMode = "embedded-desktop";
export const EditorBackendDocumentBufferFormat = "inscape.self-hosted-editor.document-buffer";
export const EditorBackendWorkspaceFileBoundaryFormat = "inscape.self-hosted-editor.workspace-file-boundary";
export const EditorBackendSaveStatusFormat = "inscape.self-hosted-editor.save-status";
export const EditorBackendRecoveryStatusFormat = "inscape.self-hosted-editor.recovery-status";
export const EditorBackendSettingsSummaryFormat = "inscape.self-hosted-editor.settings-summary";
export const EditorBackendDesktopModelFormatVersion = 1;

const defaultLanguageEndpoints = Object.freeze([
  "diagnostics",
  "completions",
  "definition",
  "references",
  "hover",
  "document-symbols",
]);

export class EditorBackendDesktopSessionModel {
  static buildProjectSession({
    documents = [],
    languageSession = null,
    lineIdentitySession = null,
    localizationSession = null,
    recoveryStatus = null,
    runtimeSession = null,
    saveStatus = null,
    sessionId = "default",
    settingsSummary = null,
    workspace = {},
  } = {}) {
    const documentBuffers = documents.map((document) => this.buildDocumentBuffer(document));
    const activeRelativePath = normalizeRelativePath(
      workspace.activeRelativePath
        || documentBuffers.find((document) => document.active)?.relativePath
        || documentBuffers[0]?.relativePath
        || ""
    );
    const revision = normalizeRevision(
      workspace.revision
        ?? Math.max(1, ...documentBuffers.map((document) => document.revision))
    );
    const saveStatusModel = this.buildSaveStatus({
      ...saveStatus,
      dirty: saveStatus?.dirty ?? documentBuffers.some((document) => document.dirty),
      relativePath: saveStatus?.relativePath || activeRelativePath,
      revision,
    });
    const recoveryStatusModel = this.buildRecoveryStatus(recoveryStatus || {});
    const settingsSummaryModel = this.buildSettingsSummary(settingsSummary || {});

    return {
      format: EditorBackendProjectSessionFormat,
      formatVersion: EditorBackendProjectSessionFormatVersion,
      languageSession: buildLanguageSession(languageSession),
      lineIdentitySession: buildSubSession(lineIdentitySession, "not-started"),
      localizationSession: buildSubSession(localizationSession, "not-started"),
      mode: EditorBackendDesktopProjectSessionMode,
      recoveryStatus: recoveryStatusModel,
      runtimeSession: buildSubSession(runtimeSession, "not-started"),
      saveStatus: saveStatusModel,
      sessionId: normalizeSessionId(sessionId),
      settingsSummary: settingsSummaryModel,
      workspace: {
        activeRelativePath,
        documentCount: documentBuffers.length,
        documents: documentBuffers.map((document) => this.buildDocumentBufferSummary(document)),
        hasUnsavedChanges: documentBuffers.some((document) => document.dirty),
        revision,
        source: "backend-buffer-store",
        workspaceName: normalizeWorkspaceName(workspace.workspaceName || workspace.name),
      },
    };
  }

  static buildDocumentBuffer({
    active = false,
    dirty = false,
    diskTextHash = "",
    existsOnDisk = true,
    lastLoadedUtc = "",
    relativePath = "",
    revision = 1,
    text = "",
  } = {}) {
    return {
      active: Boolean(active),
      dirty: Boolean(dirty),
      diskTextHash: String(diskTextHash || ""),
      existsOnDisk: Boolean(existsOnDisk),
      format: EditorBackendDocumentBufferFormat,
      formatVersion: EditorBackendDesktopModelFormatVersion,
      lastLoadedUtc: normalizeTimestamp(lastLoadedUtc),
      relativePath: normalizeRelativePath(relativePath),
      revision: normalizeRevision(revision),
      text: typeof text === "string" ? text : "",
    };
  }

  static buildDocumentBufferSummary(documentBuffer = {}) {
    const normalized = documentBuffer.format === EditorBackendDocumentBufferFormat
      ? documentBuffer
      : this.buildDocumentBuffer(documentBuffer);
    return {
      dirty: Boolean(normalized.dirty),
      diskTextHash: String(normalized.diskTextHash || ""),
      existsOnDisk: Boolean(normalized.existsOnDisk),
      lastLoadedUtc: normalizeTimestamp(normalized.lastLoadedUtc),
      relativePath: normalizeRelativePath(normalized.relativePath),
      revision: normalizeRevision(normalized.revision),
    };
  }

  static buildWorkspaceFileBoundary({
    operation = "read",
    relativePath = "",
    resolvedPath = "",
    workspaceRoot = "",
  } = {}) {
    const pathBoundary = EditorBackendWorkspacePathModel.buildBoundary({
      relativePath,
      resolvedPath,
      workspaceRoot,
    });
    if (!pathBoundary.allowed) {
      return buildWorkspaceFileBoundaryDecision({
        allowed: false,
        operation,
        pathBoundary,
        reason: pathBoundary.reason,
        relativePath: pathBoundary.relativePath,
        targetKind: "rejected",
      });
    }

    const writeTarget = EditorBackendWorkspaceWriteTargetModel.resolve({
      relativePath: pathBoundary.relativePath,
    });
    if (!writeTarget.allowed) {
      return buildWorkspaceFileBoundaryDecision({
        allowed: false,
        operation,
        pathBoundary,
        reason: writeTarget.reason,
        relativePath: pathBoundary.relativePath,
        targetKind: "rejected",
        writeTarget,
      });
    }

    return buildWorkspaceFileBoundaryDecision({
      allowed: true,
      operation,
      pathBoundary,
      reason: "",
      relativePath: pathBoundary.relativePath,
      targetKind: writeTarget.targetKind,
      writeTarget,
    });
  }

  static buildSaveStatus({
    dirty = false,
    lastError = null,
    lastSavedRevision = 0,
    relativePath = "",
    revision = 1,
    state = "",
  } = {}) {
    const normalizedState = normalizeSaveState(state, dirty, lastError);
    return {
      dirty: Boolean(dirty),
      format: EditorBackendSaveStatusFormat,
      formatVersion: EditorBackendDesktopModelFormatVersion,
      lastError: normalizeErrorSummary(lastError),
      lastSavedRevision: normalizeRevision(lastSavedRevision, 0),
      relativePath: normalizeRelativePath(relativePath),
      revision: normalizeRevision(revision),
      state: normalizedState,
    };
  }

  static buildRecoveryStatus({
    items = [],
    state = "",
  } = {}) {
    const recoveryItems = Array.isArray(items) ? items : [];
    return {
      format: EditorBackendRecoveryStatusFormat,
      formatVersion: EditorBackendDesktopModelFormatVersion,
      items: recoveryItems.map((item) => ({
        actionState: normalizeRecoveryActionState(item.actionState),
        contentHash: String(item.contentHash || item.textHash || ""),
        diskModifiedUtc: normalizeTimestamp(item.diskModifiedUtc),
        relativePath: normalizeRelativePath(item.relativePath),
        revision: normalizeRevision(item.revision),
        snapshotModifiedUtc: normalizeTimestamp(item.snapshotModifiedUtc),
      })),
      state: state || (recoveryItems.length > 0 ? "available" : "none"),
    };
  }

  static buildSettingsSummary({
    globalSettings = {},
    workspaceSettings = {},
  } = {}) {
    return {
      format: EditorBackendSettingsSummaryFormat,
      formatVersion: EditorBackendDesktopModelFormatVersion,
      global: {
        autosaveEnabled: globalSettings.autosaveEnabled !== false,
        backupRetentionDays: normalizeNonNegativeInteger(globalSettings.backupRetentionDays, 30),
        backupRetentionLimit: normalizeNonNegativeInteger(globalSettings.backupRetentionLimit, 20),
        defaultAssetDirectory: normalizeRelativePath(globalSettings.defaultAssetDirectory || "assets"),
        theme: String(globalSettings.theme || "system"),
      },
      workspace: {
        backupEnabled: workspaceSettings.backupEnabled !== false,
        entryTitle: String(workspaceSettings.entryTitle || ""),
        exportProfile: String(workspaceSettings.exportProfile || "default"),
        gitCheckpointPolicy: String(workspaceSettings.gitCheckpointPolicy || "manual"),
        resourceDirectory: normalizeRelativePath(workspaceSettings.resourceDirectory || "assets"),
        resourceImportPolicy: String(workspaceSettings.resourceImportPolicy || "copy-into-workspace"),
      },
    };
  }
}

function buildWorkspaceFileBoundaryDecision({
  allowed,
  operation,
  pathBoundary,
  reason,
  relativePath,
  targetKind,
  writeTarget,
}) {
  return {
    allowed: Boolean(allowed),
    format: EditorBackendWorkspaceFileBoundaryFormat,
    formatVersion: EditorBackendDesktopModelFormatVersion,
    operation: String(operation || "read"),
    pathBoundary,
    reason,
    relativePath,
    resolvedWorkspacePath: pathBoundary?.resolvedWorkspacePath || relativePath,
    targetKind,
    withinWorkspace: Boolean(pathBoundary?.withinWorkspace && allowed),
    writeTarget,
    workspaceRelative: Boolean(pathBoundary?.withinWorkspace && allowed),
    workspaceRoot: pathBoundary?.workspaceRoot || "",
  };
}

function buildLanguageSession(languageSession) {
  if (languageSession?.kind === "stdio-spike") {
    return {
      fallbackKind: "process-per-request",
      kind: "stdio-spike",
      supportedEndpoints: normalizeEndpointList(languageSession.supportedEndpoints, [
        "diagnostics",
        "document-symbols",
      ]),
    };
  }

  return {
    kind: "process-per-request",
    supportedEndpoints: normalizeEndpointList(languageSession?.supportedEndpoints, defaultLanguageEndpoints),
  };
}

function buildSubSession(session, fallbackKind) {
  return {
    kind: String(session?.kind || fallbackKind),
    lastError: normalizeErrorSummary(session?.lastError),
    staleReason: String(session?.staleReason || ""),
  };
}

function normalizeEndpointList(endpoints, fallback) {
  const source = Array.isArray(endpoints) ? endpoints : fallback;
  const normalized = source
    .map((endpoint) => String(endpoint || "").trim())
    .filter((endpoint) => defaultLanguageEndpoints.includes(endpoint));
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : [...fallback];
}

function normalizeErrorSummary(error) {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return {
      message: error.slice(0, 240),
    };
  }

  return {
    code: String(error.code || ""),
    message: String(error.message || "Unknown error").slice(0, 240),
  };
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeRecoveryActionState(actionState) {
  const normalized = String(actionState || "available");
  if (["available", "restored", "discarded", "later"].includes(normalized)) {
    return normalized;
  }

  return "available";
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

function normalizeRevision(revision, fallback = 1) {
  const value = Number(revision ?? fallback);
  if (!Number.isFinite(value) || value < fallback) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeSaveState(state, dirty, lastError) {
  if (lastError) {
    return "error";
  }

  const normalized = String(state || "");
  if (["dirty", "saving", "saved", "error"].includes(normalized)) {
    return normalized;
  }

  return dirty ? "dirty" : "saved";
}

function normalizeSessionId(sessionId) {
  const normalized = String(sessionId || "default").trim();
  if (!normalized) {
    return "default";
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || "default";
}

function normalizeTimestamp(timestamp) {
  return typeof timestamp === "string" ? timestamp : "";
}

function normalizeWorkspaceName(workspaceName) {
  return String(workspaceName || "workspace").trim() || "workspace";
}

export function listEditorBackendAllowedWriteTargets() {
  return EditorBackendWorkspaceWriteTargetModel.listTargetKinds();
}

export function buildEditorBackendAllowedWriteTargetCatalog() {
  return EditorBackendWorkspaceWriteTargetModel.buildCatalog();
}
