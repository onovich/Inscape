import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SelfHostedEditorDesktopGuiRecoverySmokeFormat = "inscape.self-hosted-editor.desktop-gui-recovery-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const electronPackage = readJson("node_modules/electron/package.json");
const electronCliPath = path.join(moduleRoot, "node_modules", "electron", electronPackage.bin.electron);
const electronBinaryPath = path.join(moduleRoot, "node_modules", "electron", "dist", process.platform === "win32" ? "electron.exe" : "electron");

assertEqual(packageJson.scripts?.["smoke:desktop-gui-recovery"], "node DevScripts/SelfHostedEditorDesktopGuiRecoverySmoke.js", "desktop GUI recovery smoke script");
assertFileExists(electronCliPath, "Electron CLI");
assertFileExists(electronBinaryPath, "Electron binary");

const probeResult = spawnSync(electronBinaryPath, [
  "DevScripts/SelfHostedEditorDesktopGuiRecoveryProbe.js",
], {
  cwd: moduleRoot,
  encoding: "utf8",
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: "0",
    SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART: "false",
    SELF_HOSTED_EDITOR_ELECTRON_GUI_RECOVERY_PROBE: "true",
  },
  timeout: 30000,
  windowsHide: true,
});

if (probeResult.error) {
  throw new Error(`Desktop GUI recovery probe failed to launch: ${probeResult.error.message}.\nstdout:\n${probeResult.stdout}\nstderr:\n${probeResult.stderr}`);
}

if (probeResult.status !== 0) {
  throw new Error(`Desktop GUI recovery probe failed with exit code ${probeResult.status}.\nstdout:\n${probeResult.stdout}\nstderr:\n${probeResult.stderr}`);
}

assertIncludes(probeResult.stdout, "SelfHostedEditor desktop GUI recovery probe ok", "desktop GUI recovery probe output");

console.log(`${SelfHostedEditorDesktopGuiRecoverySmokeFormat} ok`);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(moduleRoot, relativePath), "utf8"));
}

function assertFileExists(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} does not exist: ${filePath}`);
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
