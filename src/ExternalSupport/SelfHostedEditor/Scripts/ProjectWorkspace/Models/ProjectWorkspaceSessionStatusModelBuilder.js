export const ProjectWorkspaceSessionStatusFormat = "inscape.self-hosted-editor.workspace-session-panel-status";
export const ProjectWorkspaceSessionStatusFormatVersion = 1;

export class ProjectWorkspaceSessionStatusModelBuilder {
  static build({
    diagnosticsLabel = "",
    diagnosticsSnapshot = null,
    layoutState = {},
    projectSession = {},
    runtimeSnapshot = null,
    workspaceState = {},
  } = {}) {
    const workspace = projectSession?.workspace || {};
    const lifecycle = projectSession?.lifecycle || {};
    const activeRelativePath = normalizeRelativePath(
      workspaceState.filePath
        || workspace.activeRelativePath
        || lifecycle.activeRelativePath
    );
    const runtimeNodeLabel = buildRuntimeNodeLabel(runtimeSnapshot);

    return {
      backendModeLabel: normalizeLabel(projectSession?.mode || lifecycle.mode, "dev-host"),
      backendSessionLabel: formatSessionLabel(projectSession?.sessionId),
      diagnosticsLabel: normalizeLabel(diagnosticsLabel || buildDiagnosticsLabel(diagnosticsSnapshot), "fallback"),
      fileName: normalizeLabel(workspaceState.fileName || getFileNameFromPath(activeRelativePath), "No script"),
      format: ProjectWorkspaceSessionStatusFormat,
      formatVersion: ProjectWorkspaceSessionStatusFormatVersion,
      isDirty: Boolean(
        workspaceState.isDirty
          ?? workspaceState.dirty
          ?? workspace.hasUnsavedChanges
          ?? false
      ),
      languageLabel: formatSessionKind(projectSession?.languageSession, "unknown"),
      layoutLabel: normalizeLabel(layoutState.layoutLabel || layoutState.layoutMode, "split"),
      lineIdentityLabel: formatCountedSessionKind(projectSession?.lineIdentitySession, "unknown"),
      localizationLabel: formatCountedSessionKind(projectSession?.localizationSession, "unknown"),
      payloadContentExposed: false,
      runtimeLabel: normalizeLabel(runtimeNodeLabel || projectSession?.runtimeSession?.kind, "unavailable"),
      runtimeSessionLabel: formatCountedSessionKind(projectSession?.runtimeSession, "unavailable"),
      sourceLabel: normalizeLabel(workspaceState.sourceLabel || workspace.source, "loaded"),
      viewLabel: normalizeLabel(layoutState.viewLabel || layoutState.activeView || workspaceState.activeView, "editor"),
      workspaceFileCount: normalizeNonNegativeInteger(
        workspaceState.workspaceFileCount
          ?? workspace.documentCount
          ?? lifecycle.documentCount,
        0
      ),
      workspaceName: normalizeLabel(
        workspaceState.workspaceName
          || workspace.workspaceName
          || getWorkspaceNameFromPath(activeRelativePath),
        "workspace"
      ),
      workspaceRevisionLabel: String(normalizePositiveInteger(
        workspace.revision
          ?? workspaceState.revision
          ?? lifecycle.revision,
        1
      )),
    };
  }
}

function buildDiagnosticsLabel(diagnosticsSnapshot) {
  if (diagnosticsSnapshot?.provider === "language-server") {
    return "LanguageServer";
  }

  if (diagnosticsSnapshot?.provider) {
    return "Draft fallback";
  }

  return "fallback";
}

function buildRuntimeNodeLabel(runtimeSnapshot) {
  if (!runtimeSnapshot || runtimeSnapshot.provider !== "runtime-project") {
    return "";
  }

  return normalizeLabel(
    runtimeSnapshot.snapshot?.state?.currentNodeName
      || runtimeSnapshot.snapshot?.currentNode?.name,
    "started"
  );
}

function formatCountedSessionKind(session, fallbackKind) {
  const kind = formatSessionKind(session, fallbackKind);
  const entryCount = normalizeOptionalNonNegativeInteger(session?.entryCount);
  return entryCount === null ? kind : `${kind} (${entryCount})`;
}

function formatSessionKind(session, fallbackKind) {
  return normalizeLabel(session?.kind, fallbackKind);
}

function formatSessionLabel(sessionId) {
  const text = normalizeLabel(sessionId, "default");
  return text.length > 24 ? `${text.slice(0, 21)}...` : text;
}

function getFileNameFromPath(relativePath) {
  const segments = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  return segments.at(-1) || "";
}

function getWorkspaceNameFromPath(relativePath) {
  const segments = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  if (segments.length >= 2) {
    return segments[0];
  }

  return (segments[0] || "").replace(/\.inscape$/i, "");
}

function normalizeLabel(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeNonNegativeInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeOptionalNonNegativeInteger(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  return normalizeNonNegativeInteger(value, null);
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}
