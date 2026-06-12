import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function normalizeWorkspacePayload(workspace) {
  if (!workspace || !Array.isArray(workspace.documents)) {
    return null;
  }

  const documents = workspace.documents
    .filter((document) => typeof document?.relativePath === "string" && typeof document?.text === "string")
    .map((document) => ({
      relativePath: sanitizeRelativePath(document.relativePath),
      text: document.text,
    }))
    .filter((document) => document.relativePath);

  if (documents.length === 0) {
    return null;
  }

  return {
    currentFilePath: sanitizeRelativePath(workspace.currentFilePath || documents[0].relativePath) || documents[0].relativePath,
    documents,
  };
}

export async function withTemporaryWorkspace(workspace, fallbackScriptText, callback) {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "inscape-self-hosted-editor-"));
  const normalizedWorkspace = workspace || {
    currentFilePath: "draft.inscape",
    documents: [{
      relativePath: "draft.inscape",
      text: fallbackScriptText,
    }],
  };

  try {
    for (const document of normalizedWorkspace.documents) {
      const fullPath = resolveTemporaryWorkspacePath(tempRoot, document.relativePath);
      await fsp.mkdir(path.dirname(fullPath), {
        recursive: true,
      });
      await fsp.writeFile(fullPath, document.text, "utf8");
    }

    const activeRelativePath = normalizedWorkspace.currentFilePath || normalizedWorkspace.documents[0].relativePath;
    const activeFilePath = resolveTemporaryWorkspacePath(tempRoot, activeRelativePath);
    return await callback({
      tempRoot,
      activeFilePath,
      activeRelativePath,
    });
  } finally {
    await fsp.rm(tempRoot, {
      force: true,
      recursive: true,
    });
  }
}

export function resolveTemporaryWorkspacePath(tempRoot, relativePath, fallbackRelativePath = "") {
  const safeRelativePath = sanitizeRelativePath(relativePath) || sanitizeRelativePath(fallbackRelativePath);
  if (!safeRelativePath) {
    throw new Error("Temporary workspace path requires a safe relative path.");
  }

  const rootPath = path.resolve(tempRoot);
  const fullPath = path.resolve(rootPath, safeRelativePath);
  const relativeToRoot = path.relative(rootPath, fullPath);
  if (!relativeToRoot || relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Temporary workspace path escapes workspace root: ${safeRelativePath}`);
  }

  return fullPath;
}

export function sanitizeRelativePath(relativePath) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (!normalized || /^\/+/.test(normalized) || /^[A-Za-z]:/.test(normalized) || normalized.split("/").includes("..")) {
    return "";
  }

  return normalized;
}
