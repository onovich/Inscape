import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSelfHostedEditorDesktopPackageReadiness } from "./SelfHostedEditorDesktopPackageContractCheck.js";

export const SelfHostedEditorDesktopPackageSmokeFormat = "inscape.self-hosted-editor.desktop-package-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const readiness = buildSelfHostedEditorDesktopPackageReadiness(packageJson, { moduleRoot });

assertEqual(readiness.format, "inscape.self-hosted-editor.desktop-package-readiness", "desktop package readiness format");
assertEqual(readiness.windowsPackageScriptAvailable, true, "desktop package script availability");
assertEqual(readiness.windowsPackageGenerated, true, "desktop package artifact generated");
assertEqual(readiness.knownLimitations.includes("windows-package-not-generated"), false, "desktop package generated limitation");

assertFileSizeAtLeast(readiness.expectedExecutablePath, 50 * 1024 * 1024, "desktop package executable");
const appAsarPath = path.join(moduleRoot, "dist", "win-unpacked", "resources", "app.asar");
assertFileSizeAtLeast(appAsarPath, 1024 * 1024, "desktop package app.asar");
assertPathMissing(path.join(moduleRoot, "dist", "win-unpacked", "DevScripts"), "desktop package must not expose DevScripts as a loose directory");

const builderDebugPath = path.join(moduleRoot, "dist", "builder-debug.yml");
assertFileSizeAtLeast(builderDebugPath, 1, "desktop package builder debug metadata");
const builderDebugText = readText("dist/builder-debug.yml");
assertIncludes(builderDebugText, "Desktop/**/*", "desktop package builder debug metadata");
assertIncludes(builderDebugText, "node_modules/monaco-editor/**/*", "desktop package builder debug metadata");

console.log(`${SelfHostedEditorDesktopPackageSmokeFormat} ok: ${readiness.expectedExecutableName}`);

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
}

function assertFileSizeAtLeast(filePath, minimumBytes, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} is missing: ${filePath}`);
  }

  const actualSize = fs.statSync(filePath).size;
  if (actualSize < minimumBytes) {
    throw new Error(`${label} expected at least ${minimumBytes} bytes, got ${actualSize}`);
  }
}

function assertPathMissing(targetPath, label) {
  if (fs.existsSync(targetPath)) {
    throw new Error(`${label}: ${targetPath}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text).includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
