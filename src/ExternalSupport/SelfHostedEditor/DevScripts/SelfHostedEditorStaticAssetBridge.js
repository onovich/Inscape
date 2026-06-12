import fs from "node:fs/promises";
import path from "node:path";

const defaultWorkbenchDocumentPath = "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html";
const allowedModuleStaticAssetPrefixes = [
  "Resources/",
  "Scripts/",
  "node_modules/monaco-editor/min/vs/",
];
const staticAssetContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");
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
  if (target.statusCode === 415) {
    response.writeHead(415);
    response.end("Unsupported media type");
    return;
  }

  try {
    const body = await fs.readFile(target.filePath);
    response.writeHead(200, createSelfHostedEditorStaticAssetHeaders(target.filePath));
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
  if (!isAllowedSelfHostedEditorStaticAsset(relativePath)) {
    return {
      fileRoot,
      relativePath,
      statusCode: 403,
    };
  }

  const mimeType = staticAssetMimeTypes.get(path.extname(relativePath));
  if (!mimeType) {
    return {
      fileRoot,
      relativePath,
      statusCode: 415,
    };
  }

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
    mimeType,
    relativePath,
    statusCode: 200,
  };
}

export function createSelfHostedEditorStaticAssetHeaders(filePath) {
  const contentType = staticAssetMimeTypes.get(path.extname(filePath)) || "application/octet-stream";
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": contentType,
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  };

  if (path.extname(filePath) === ".html") {
    headers["Content-Security-Policy"] = staticAssetContentSecurityPolicy;
  }

  return headers;
}

function isAllowedSelfHostedEditorStaticAsset(relativePath) {
  return relativePath === defaultWorkbenchDocumentPath
    || relativePath.startsWith("samples/")
    || allowedModuleStaticAssetPrefixes.some((prefix) => relativePath.startsWith(prefix));
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
