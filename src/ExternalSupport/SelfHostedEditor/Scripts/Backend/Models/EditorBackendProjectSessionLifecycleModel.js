export const EditorBackendProjectSessionLifecycleFormat = "inscape.self-hosted-editor.project-session-lifecycle";
export const EditorBackendProjectSessionLifecycleFormatVersion = 1;

export class EditorBackendProjectSessionLifecycleModel {
  static buildLifecycle({
    active = true,
    activeRelativePath = "",
    documentCount = 0,
    mode = "embedded-desktop",
    revision = 1,
    sessionId = "default",
    windowId = "main",
    workspaceRoot = "",
  } = {}) {
    return {
      active: Boolean(active),
      activeRelativePath: normalizeRelativePath(activeRelativePath),
      documentCount: normalizeNonNegativeInteger(documentCount),
      format: EditorBackendProjectSessionLifecycleFormat,
      formatVersion: EditorBackendProjectSessionLifecycleFormatVersion,
      mode: String(mode || "embedded-desktop"),
      ownership: "single-window-active-session",
      revision: normalizeRevision(revision),
      sessionId: normalizeSessionId(sessionId),
      windowId: normalizeWindowId(windowId),
      workspaceRoot: normalizeWorkspaceRoot(workspaceRoot),
    };
  }
}

function normalizeNonNegativeInteger(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.floor(numericValue);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}

function normalizeRevision(revision) {
  const value = Number(revision ?? 1);
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizeSessionId(sessionId) {
  const normalized = String(sessionId || "default").trim();
  if (!normalized) {
    return "default";
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || "default";
}

function normalizeWindowId(windowId) {
  const normalized = String(windowId || "main").trim();
  if (!normalized) {
    return "main";
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || "main";
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}
