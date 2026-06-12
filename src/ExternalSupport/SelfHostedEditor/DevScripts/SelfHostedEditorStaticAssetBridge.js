import fs from "node:fs/promises";
import path from "node:path";

const defaultWorkbenchDocumentPath = "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html";
const staticAssetMimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".inscape", "text/plain; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export async function serveSelfHostedEditorStaticAsset(requestUrl, response, roots) {
  const target = resolveSelfHostedEditorStaticAssetTarget(requestUrl.pathname, roots);
  if (target.statusCode === 403) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(target.filePath);
    response.writeHead(200, {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": staticAssetMimeTypes.get(path.extname(target.filePath)) || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

export function resolveSelfHostedEditorStaticAssetTarget(pathname, roots) {
  const relativePath = normalizeStaticAssetRelativePath(pathname);
  if (!relativePath) {
    return {
      relativePath: "",
      statusCode: 403,
    };
  }

  const moduleRoot = path.resolve(roots.moduleRoot);
  const repoRoot = path.resolve(roots.repoRoot);
  const fileRoot = relativePath.startsWith("samples/")
    ? repoRoot
    : moduleRoot;
  const filePath = path.resolve(fileRoot, relativePath);
  if (!isPathInsideRoot(fileRoot, filePath)) {
    return {
      filePath,
      fileRoot,
      relativePath,
      statusCode: 403,
    };
  }

  return {
    filePath,
    fileRoot,
    relativePath,
    statusCode: 200,
  };
}

function normalizeStaticAssetRelativePath(pathname) {
  if (pathname === "/") {
    return defaultWorkbenchDocumentPath;
  }

  let decodedPathname = "";
  try {
    decodedPathname = decodeURIComponent(String(pathname || ""));
  } catch {
    return "";
  }

  const normalized = decodedPathname
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (
    !normalized
    || normalized.split("/").includes("..")
    || /^[A-Za-z]:/.test(normalized)
    || path.posix.isAbsolute(normalized)
  ) {
    return "";
  }

  return normalized;
}

function isPathInsideRoot(root, candidatePath) {
  const relativePath = path.relative(root, candidatePath);
  return !relativePath || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}
