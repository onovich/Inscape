export const EditorBackendProjectSessionFormat = "inscape.self-hosted-editor.project-session";
export const EditorBackendProjectSessionFormatVersion = 1;
const defaultLanguageEndpoints = Object.freeze([
  "diagnostics",
  "completions",
  "definition",
  "references",
  "hover",
  "document-symbols",
]);
const stdioLanguageEndpoints = Object.freeze([
  "diagnostics",
  "document-symbols",
]);

export class EditorBackendProjectSessionModel {
  static buildDevHostProjectSession({
    sessionCacheStatus = {},
    sessionId = "default",
    workspace = null,
  } = {}) {
    const caches = sessionCacheStatus?.caches || {};
    return {
      format: EditorBackendProjectSessionFormat,
      formatVersion: EditorBackendProjectSessionFormatVersion,
      languageSession: buildLanguageSessionModel(sessionCacheStatus.languageSession),
      lineIdentitySession: {
        entryCount: normalizeEntryCount(caches.lineMap),
        kind: "bounded-cache",
      },
      localizationSession: {
        entryCount: normalizeEntryCount(caches.localizationBaseline),
        kind: "bounded-cache",
      },
      mode: "dev-host",
      runtimeSession: {
        entryCount: normalizeEntryCount(caches.runtime),
        kind: "bounded-cache",
      },
      sessionId: normalizeSessionId(sessionId),
      workspace: buildWorkspaceModel(workspace),
    };
  }
}

function buildLanguageSessionModel(languageSessionStatus) {
  if (languageSessionStatus?.kind === "stdio-spike") {
    return {
      fallbackEndpoints: normalizeEndpointList(languageSessionStatus.fallbackEndpoints, defaultLanguageEndpoints)
        .filter((endpoint) => !stdioLanguageEndpoints.includes(endpoint)),
      fallbackKind: "process-per-request",
      kind: "stdio-spike",
      supportedEndpoints: normalizeEndpointList(languageSessionStatus.supportedEndpoints, stdioLanguageEndpoints),
    };
  }

  return {
    kind: "process-per-request",
    supportedEndpoints: normalizeEndpointList(languageSessionStatus?.supportedEndpoints, defaultLanguageEndpoints),
  };
}

function buildWorkspaceModel(workspace) {
  const documents = Array.isArray(workspace?.documents) ? workspace.documents : [];
  return {
    activeRelativePath: normalizeRelativePath(
      workspace?.activeRelativePath
        || workspace?.currentFilePath
        || workspace?.filePath
        || documents[0]?.relativePath
        || ""
    ),
    documentCount: documents.length,
    revision: normalizeRevision(workspace?.revision ?? workspace?.documentRevision ?? workspace?.workspaceRevision),
    source: documents.length > 0 ? "request-snapshot" : "temporary-workspace",
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

function normalizeEntryCount(cacheStatus) {
  const value = Number(cacheStatus?.entryCount || 0);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "").replace(/\\/g, "/");
}

function normalizeRevision(revision) {
  const value = Number(revision || 1);
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
