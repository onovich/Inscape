export const EditorBackendSessionStatusFormat = "inscape.self-hosted-editor.backend-session-status";
export const EditorBackendSessionStatusFormatVersion = 1;

export class EditorBackendSessionStatusModel {
  static buildDevHostStatus(sessionCacheStatus = {}) {
    const caches = sessionCacheStatus?.caches || {};
    return {
      format: EditorBackendSessionStatusFormat,
      formatVersion: EditorBackendSessionStatusFormatVersion,
      mode: "dev-host",
      workspace: {
        source: "temporary-workspace",
        documentCount: 0,
      },
      languageSession: {
        kind: "process-per-request",
      },
      runtimeSession: {
        kind: "bounded-cache",
        entryCount: normalizeEntryCount(caches.runtime),
      },
      lineIdentitySession: {
        kind: "bounded-cache",
        entryCount: normalizeEntryCount(caches.lineMap),
      },
      localizationSession: {
        kind: "bounded-cache",
        entryCount: normalizeEntryCount(caches.localizationBaseline),
      },
    };
  }
}

function normalizeEntryCount(cacheStatus) {
  const value = Number(cacheStatus?.entryCount || 0);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}
