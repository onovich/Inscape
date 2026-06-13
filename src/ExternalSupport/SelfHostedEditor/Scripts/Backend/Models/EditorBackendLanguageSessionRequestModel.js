export const EditorBackendLanguageSessionRequestFormat = "inscape.self-hosted-editor.language-session-request";
export const EditorBackendLanguageSessionRequestFormatVersion = 1;

export class EditorBackendLanguageSessionRequestModel {
  static build({
    kind,
    request = {},
    sessionId = "default",
  } = {}) {
    const workspace = request.workspace || null;
    return {
      activeRelativePath: normalizeRelativePath(
        request.activeRelativePath
          || workspace?.currentFilePath
          || workspace?.activeRelativePath
          || workspace?.documents?.[0]?.relativePath
          || ""
      ),
      documentRevision: normalizeRevision(
        request.documentRevision
          ?? request.revision
          ?? workspace?.revision
          ?? workspace?.documentRevision
      ),
      format: EditorBackendLanguageSessionRequestFormat,
      formatVersion: EditorBackendLanguageSessionRequestFormatVersion,
      query: buildQuery(kind, request),
      scriptText: typeof request.scriptText === "string" ? request.scriptText : "",
      sessionId: normalizeSessionId(request.sessionId || sessionId),
      workspace,
    };
  }

  static toDevHostPayload(languageRequest) {
    return {
      ...languageRequest.query,
      activeRelativePath: languageRequest.activeRelativePath,
      documentRevision: languageRequest.documentRevision,
      languageSession: {
        activeRelativePath: languageRequest.activeRelativePath,
        documentRevision: languageRequest.documentRevision,
        format: languageRequest.format,
        formatVersion: languageRequest.formatVersion,
        query: languageRequest.query,
        sessionId: languageRequest.sessionId,
      },
      scriptText: languageRequest.scriptText,
      sessionId: languageRequest.sessionId,
      workspace: languageRequest.workspace,
    };
  }
}

function buildQuery(kind, request) {
  const normalizedKind = String(kind || "").trim() || "unknown";
  const query = {
    kind: normalizedKind,
  };
  if (normalizedKind === "definition") {
    query.definitionName = String(request.definitionName || "");
  }
  if (normalizedKind === "hover") {
    query.hoverKind = String(request.hoverKind || "");
    query.hoverName = String(request.hoverName || "");
  }
  if (normalizedKind === "references") {
    query.referenceName = String(request.referenceName || "");
  }

  return query;
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
