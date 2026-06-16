import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SelfHostedEditorDesktopRuntimeSmokeFormat = "inscape.self-hosted-editor.desktop-runtime-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");

const electronVersionRange = packageJson.devDependencies?.electron || packageJson.dependencies?.electron;
assert(electronVersionRange, "desktop runtime smoke requires an Electron package dependency");
assertEqual(packageJson.scripts?.["start:desktop"], "electron Desktop/ElectronMain.js", "desktop runtime start script");
assertEqual(packageJson.scripts?.["smoke:desktop-runtime"], "node DevScripts/SelfHostedEditorDesktopRuntimeSmoke.js", "desktop runtime smoke script");

const lockfileRootPackage = packageLock.packages?.[""] || {};
assertEqual(lockfileRootPackage.devDependencies?.electron || lockfileRootPackage.dependencies?.electron, electronVersionRange, "desktop runtime lockfile Electron range");

const electronPackage = readJson("node_modules/electron/package.json");
assert(electronPackage.bin?.electron, "Electron package must expose an electron CLI bin");

const electronCliPath = path.join(moduleRoot, "node_modules", "electron", electronPackage.bin.electron);
assertFileExists(electronCliPath, "Electron CLI");

const versionResult = runElectron(["--version"], "Electron version");
const electronVersionOutput = `${versionResult.stdout}${versionResult.stderr}`.trim();
const electronVersion = electronVersionOutput.match(/v\d+\.\d+\.\d+/)?.[0] || "";
assert(electronVersion, `Electron version smoke expected a version, got ${JSON.stringify(electronVersionOutput)}`);

const probeResult = runElectron(["DevScripts/SelfHostedEditorElectronRuntimeProbe.js"], "Electron guarded main load", {
  SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART: "false",
  SELF_HOSTED_EDITOR_ELECTRON_RUNTIME_PROBE: "true",
});
assertIncludes(probeResult.stdout, "SelfHostedEditor electron runtime probe ok", "Electron runtime probe output");

console.log(`${SelfHostedEditorDesktopRuntimeSmokeFormat} ok: ${electronVersion}`);

function runElectron(args, label, extraEnvironment = {}) {
  const result = spawnSync(process.execPath, [electronCliPath, ...args], {
    cwd: moduleRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ELECTRON_ENABLE_LOGGING: "0",
      ...extraEnvironment,
    },
    timeout: 20000,
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`${label} failed to launch: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  return result;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
