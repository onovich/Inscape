export const EditorBackendWorkspaceSessionCleanupFormat = "inscape.self-hosted-editor.workspace-session-cleanup";
export const EditorBackendWorkspaceSessionCleanupFormatVersion = 1;

const cleanupTargetKinds = Object.freeze([
  "language-session",
  "runtime-session",
  "line-identity-session",
  "localization-session",
  "temporary-workspace",
]);

export class EditorBackendWorkspaceSessionCleanupModel {
  static buildSummary({
    cacheCounts = {},
    operation = "close-workspace",
    sessionId = "default",
    targets = cleanupTargetKinds,
    workspaceRoot = "",
  } = {}) {
    const normalizedTargets = normalizeTargets(targets);
    const normalizedCacheCounts = normalizeCacheCounts(cacheCounts);

    return {
      cacheCounts: normalizedCacheCounts,
      format: EditorBackendWorkspaceSessionCleanupFormat,
      formatVersion: EditorBackendWorkspaceSessionCleanupFormatVersion,
      operation: normalizeOperation(operation),
      payloadContentExposed: false,
      sessionId: normalizeSessionId(sessionId),
      targetCount: normalizedTargets.length,
      targets: normalizedTargets.map((targetKind) => ({
        action: "clear",
        kind: targetKind,
      })),
      workspaceRoot: normalizeWorkspaceRoot(workspaceRoot),
    };
  }
}

function normalizeCacheCounts(cacheCounts) {
  const source = cacheCounts || {};
  return {
    lineMapSidecars: normalizeNonNegativeInteger(source.lineMapSidecars),
    localizationBaselines: normalizeNonNegativeInteger(source.localizationBaselines),
    runtimeSnapshots: normalizeNonNegativeInteger(source.runtimeSnapshots),
    temporaryWorkspaceFiles: normalizeNonNegativeInteger(source.temporaryWorkspaceFiles),
  };
}

function normalizeNonNegativeInteger(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.floor(numericValue);
}

function normalizeOperation(operation) {
  const normalized = String(operation || "close-workspace").trim();
  if (["close-workspace", "switch-workspace"].includes(normalized)) {
    return normalized;
  }

  return "close-workspace";
}

function normalizeSessionId(sessionId) {
  const normalized = String(sessionId || "default").trim();
  if (!normalized) {
    return "default";
  }

  return normalized.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 120) || "default";
}

function normalizeTargets(targets) {
  const source = Array.isArray(targets) ? targets : cleanupTargetKinds;
  const normalized = source
    .map((target) => String(target || "").trim())
    .filter((target) => cleanupTargetKinds.includes(target));
  const unique = [...new Set(normalized)];
  return unique.length > 0 ? unique : [...cleanupTargetKinds];
}

function normalizeWorkspaceRoot(workspaceRoot) {
  return String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}
