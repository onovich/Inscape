export const EditorBackendWorkspaceWriteTargetCatalogFormat = "inscape.self-hosted-editor.workspace-write-target-catalog";
export const EditorBackendWorkspaceWriteTargetDecisionFormat = "inscape.self-hosted-editor.workspace-write-target-decision";
export const EditorBackendWorkspaceWriteTargetFormatVersion = 1;

const writeTargetPolicies = Object.freeze([
  buildWriteTargetPolicy({
    match: (path) => path.endsWith(".inscape"),
    pathRule: "*.inscape",
    targetKind: "inscape-document",
  }),
  buildWriteTargetPolicy({
    match: (path) => path.endsWith(".csv"),
    pathRule: "*.csv",
    targetKind: "localization-csv",
  }),
  buildWriteTargetPolicy({
    match: (path) => path.endsWith("/inscape.node-map.json") || path === "inscape.node-map.json",
    pathRule: "**/inscape.node-map.json",
    targetKind: "node-map-sidecar",
  }),
  buildWriteTargetPolicy({
    match: (path) => path.endsWith("/inscape.line-map.json") || path === "inscape.line-map.json",
    pathRule: "**/inscape.line-map.json",
    targetKind: "line-map-sidecar",
  }),
  buildWriteTargetPolicy({
    match: (path) => matchesDirectoryTarget(path, ".inscape-workspace/recovery/"),
    pathRule: ".inscape-workspace/recovery/**",
    targetKind: "recovery-snapshot",
  }),
  buildWriteTargetPolicy({
    match: (path) => matchesDirectoryTarget(path, ".inscape-workspace/backups/"),
    pathRule: ".inscape-workspace/backups/**",
    targetKind: "backup-artifact",
  }),
  buildWriteTargetPolicy({
    match: (path) => matchesDirectoryTarget(path, ".inscape-workspace/cache/"),
    pathRule: ".inscape-workspace/cache/**",
    targetKind: "cache-artifact",
  }),
  buildWriteTargetPolicy({
    match: (path) => matchesDirectoryTarget(path, "assets/"),
    pathRule: "assets/**",
    targetKind: "asset-copy",
  }),
]);

export class EditorBackendWorkspaceWriteTargetModel {
  static buildCatalog() {
    return {
      format: EditorBackendWorkspaceWriteTargetCatalogFormat,
      formatVersion: EditorBackendWorkspaceWriteTargetFormatVersion,
      targets: writeTargetPolicies.map((policy) => ({
        pathRule: policy.pathRule,
        targetKind: policy.targetKind,
      })),
    };
  }

  static listTargetKinds() {
    return writeTargetPolicies.map((policy) => policy.targetKind);
  }

  static resolve({
    relativePath = "",
  } = {}) {
    const normalizedPath = normalizeRelativePath(relativePath);
    const lowerPath = normalizedPath.toLowerCase();
    const policy = writeTargetPolicies.find((candidate) => candidate.match(lowerPath));
    if (!policy) {
      return buildWriteTargetDecision({
        allowed: false,
        pathRule: "",
        reason: "write-target-not-whitelisted",
        relativePath: normalizedPath,
        targetKind: "rejected",
      });
    }

    return buildWriteTargetDecision({
      allowed: true,
      pathRule: policy.pathRule,
      reason: "",
      relativePath: normalizedPath,
      targetKind: policy.targetKind,
    });
  }
}

function buildWriteTargetDecision({
  allowed,
  pathRule,
  reason,
  relativePath,
  targetKind,
}) {
  return {
    allowed: Boolean(allowed),
    format: EditorBackendWorkspaceWriteTargetDecisionFormat,
    formatVersion: EditorBackendWorkspaceWriteTargetFormatVersion,
    pathRule,
    reason,
    relativePath,
    targetKind,
  };
}

function buildWriteTargetPolicy({
  match,
  pathRule,
  targetKind,
}) {
  return Object.freeze({
    match,
    pathRule,
    targetKind,
  });
}

function matchesDirectoryTarget(path, directoryPrefix) {
  return path.startsWith(directoryPrefix)
    && path.length > directoryPrefix.length
    && !path.endsWith("/");
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+/g, "/");
}
