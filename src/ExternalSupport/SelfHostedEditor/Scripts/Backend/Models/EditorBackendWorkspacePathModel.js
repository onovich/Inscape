export const EditorBackendWorkspacePathBoundaryFormat = "inscape.self-hosted-editor.workspace-path-boundary";
export const EditorBackendWorkspacePathBoundaryFormatVersion = 1;

export class EditorBackendWorkspacePathModel {
  static buildBoundary({
    relativePath = "",
    resolvedPath = "",
    workspaceRoot = "",
  } = {}) {
    const pathInput = normalizePathInput(relativePath);
    const root = normalizeWorkspaceRoot(workspaceRoot);
    const rejectionReason = getWorkspacePathRejectionReason(pathInput);
    const resolvedWorkspacePath = buildResolvedWorkspacePath({
      relativePath: pathInput.normalizedPath,
      resolvedPath,
      workspaceRoot: root,
    });
    const withinWorkspace = isResolvedPathWithinWorkspace(root, resolvedWorkspacePath);
    const reason = rejectionReason || (withinWorkspace ? "" : "outside-workspace-rejected");

    return {
      allowed: !reason,
      format: EditorBackendWorkspacePathBoundaryFormat,
      formatVersion: EditorBackendWorkspacePathBoundaryFormatVersion,
      reason,
      relativePath: pathInput.normalizedPath,
      resolvedWorkspacePath,
      withinWorkspace,
      workspaceRoot: root,
    };
  }
}

function buildResolvedWorkspacePath({
  relativePath,
  resolvedPath,
  workspaceRoot,
}) {
  const normalizedResolvedPath = normalizeWorkspaceRoot(resolvedPath);
  if (normalizedResolvedPath) {
    return normalizedResolvedPath;
  }

  if (!relativePath) {
    return workspaceRoot;
  }

  return workspaceRoot ? `${workspaceRoot}/${relativePath}` : relativePath;
}

function getWorkspacePathRejectionReason(pathInput) {
  if (!pathInput.source.trim()) {
    return "empty-relative-path";
  }

  if (pathInput.hasNullByte) {
    return "invalid-relative-path";
  }

  if (isAbsolutePath(pathInput.trimmedSource)) {
    return "absolute-path-rejected";
  }

  if (hasUriScheme(pathInput.trimmedSource)) {
    return "absolute-path-rejected";
  }

  const segments = pathInput.normalizedPath.split("/");
  if (segments.includes("..")) {
    return "path-traversal-rejected";
  }

  if (segments.includes(".")) {
    return "invalid-relative-path";
  }

  if (pathInput.normalizedPath.includes(":")) {
    return "invalid-relative-path";
  }

  return "";
}

function hasUriScheme(source) {
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(source);
}

function isAbsolutePath(source) {
  return /^[A-Za-z]:(?:[\\/]|$)/.test(source)
    || /^[\\/]{2}/.test(source)
    || source.startsWith("/")
    || source.startsWith("\\");
}

function isResolvedPathWithinWorkspace(workspaceRoot, resolvedWorkspacePath) {
  if (!workspaceRoot) {
    return true;
  }

  return resolvedWorkspacePath === workspaceRoot
    || resolvedWorkspacePath.startsWith(`${workspaceRoot}/`);
}

function normalizePathInput(relativePath) {
  const source = String(relativePath ?? "");
  const trimmedSource = source.trim();
  return {
    hasNullByte: source.includes("\0"),
    normalizedPath: trimmedSource
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .replace(/\/+/g, "/"),
    source,
    trimmedSource,
  };
}

function normalizeWorkspaceRoot(workspaceRoot) {
  const normalizedRoot = String(workspaceRoot || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");

  return normalizedRoot === "." ? "" : normalizedRoot;
}
