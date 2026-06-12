import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSelfHostedEditorStaticAssetHeaders,
  resolveSelfHostedEditorStaticAssetTarget,
} from "./SelfHostedEditorStaticAssetBridge.js";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const roots = {
  moduleRoot,
  repoRoot,
};

const workbenchAsset = resolveSelfHostedEditorStaticAssetTarget("/", roots);
assertEqual(workbenchAsset.statusCode, 200, "workbench asset status");
assertEqual(workbenchAsset.fileRoot, moduleRoot, "workbench asset root");
assertEqual(workbenchAsset.mimeType, "text/html; charset=utf-8", "workbench asset MIME");

const scriptAsset = resolveSelfHostedEditorStaticAssetTarget("/Scripts/Entries/SelfHostedEditorAppEntry.js", roots);
assertEqual(scriptAsset.statusCode, 200, "script asset status");
assertEqual(scriptAsset.mimeType, "text/javascript; charset=utf-8", "script asset MIME");

const monacoAsset = resolveSelfHostedEditorStaticAssetTarget("/node_modules/monaco-editor/min/vs/loader.js", roots);
assertEqual(monacoAsset.statusCode, 200, "monaco loader asset status");
assertEqual(monacoAsset.mimeType, "text/javascript; charset=utf-8", "monaco loader asset MIME");

const sampleAsset = resolveSelfHostedEditorStaticAssetTarget("/samples/court-loop.inscape", roots);
assertEqual(sampleAsset.statusCode, 200, "sample asset status");
assertEqual(sampleAsset.fileRoot, repoRoot, "sample asset root");
assertEqual(sampleAsset.mimeType, "text/plain; charset=utf-8", "sample asset MIME");

for (const blockedPath of [
  "/DevScripts/StartSelfHostedEditorPreview.js",
  "/package.json",
  "/node_modules/monaco-editor/package.json",
]) {
  const target = resolveSelfHostedEditorStaticAssetTarget(blockedPath, roots);
  assertEqual(target.statusCode, 403, `blocked asset path: ${blockedPath}`);
}

for (const unsafePath of [
  "/../AGENTS.md",
  "/samples/../AGENTS.md",
  "/C:/escape.inscape",
]) {
  const target = resolveSelfHostedEditorStaticAssetTarget(unsafePath, roots);
  assertEqual(target.statusCode, 403, `unsafe asset path: ${unsafePath}`);
}

const unsupportedAsset = resolveSelfHostedEditorStaticAssetTarget("/Resources/Styles/unknown.bin", roots);
assertEqual(unsupportedAsset.statusCode, 415, "unsupported asset extension status");

const htmlHeaders = createSelfHostedEditorStaticAssetHeaders(workbenchAsset.filePath);
assertEqual(htmlHeaders["Cache-Control"], "no-store, max-age=0", "static asset cache policy");
assertEqual(htmlHeaders["Content-Type"], "text/html; charset=utf-8", "static asset content type");
assertEqual(htmlHeaders["Cross-Origin-Resource-Policy"], "same-origin", "static asset CORP header");
assertEqual(htmlHeaders["X-Content-Type-Options"], "nosniff", "static asset nosniff header");
assertIncludes(htmlHeaders["Content-Security-Policy"], "object-src 'none'", "static asset CSP object boundary");
assertIncludes(htmlHeaders["Content-Security-Policy"], "frame-ancestors 'none'", "static asset CSP framing boundary");

const scriptHeaders = createSelfHostedEditorStaticAssetHeaders(scriptAsset.filePath);
assertEqual(scriptHeaders["Content-Type"], "text/javascript; charset=utf-8", "script content type");
assertEqual(scriptHeaders["Content-Security-Policy"], undefined, "non-document assets should not carry document CSP");

console.log("SelfHostedEditor static asset bridge contract ok");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text || "").includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(text)} to include ${JSON.stringify(expected)}`);
  }
}
