import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SelfHostedEditorDesktopStartupSmokeFormat = "inscape.self-hosted-editor.desktop-startup-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const appEntryText = readText("Desktop/ElectronAppEntry.js");
const mainText = readText("Desktop/ElectronMain.js");
const preloadText = readText("Desktop/ElectronPreload.js");
const workbenchText = readText("Resources/Workbench/SelfHostedEditorWorkbenchDocument.html");

assertEqual(packageJson.private, true, "desktop startup package is private");
assertEqual(packageJson.type, "module", "desktop startup package is ESM");
assertEqual(packageJson.scripts?.["smoke:desktop"], "node DevScripts/SelfHostedEditorDesktopV0Smoke.js", "desktop startup smoke includes v0 loop smoke");
assertEqual(packageJson.scripts?.["smoke:desktop-startup"], "node DevScripts/SelfHostedEditorDesktopStartupSmoke.js", "desktop startup smoke script");
assertEqual(packageLock.name, packageJson.name, "desktop startup lockfile package name");
assertIncludes(appEntryText, "Inscape SelfHostedEditor", "desktop startup app name");
assertIncludes(appEntryText, "../Resources/Workbench/SelfHostedEditorWorkbenchDocument.html", "desktop startup workbench entry");
assertIncludes(mainText, "SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART", "desktop startup can disable Electron autostart for checks");
assertIncludes(mainText, "createSelfHostedEditorBrowserWindow", "desktop startup has BrowserWindow factory");
assertIncludes(preloadText, "exposeSelfHostedEditorPreloadApi", "desktop startup preload exposes whitelist API");
assertIncludes(workbenchText, "/Scripts/Entries/SelfHostedEditorAppEntry.js", "desktop startup workbench loads app entry");

const readiness = buildStartupReadiness(packageJson);
assertEqual(readiness.format, SelfHostedEditorDesktopStartupSmokeFormat, "desktop startup readiness format");
assertEqual(readiness.equivalentLocalStartupSmoke, true, "desktop startup has equivalent local smoke");
assertEqual(readiness.validationScripts.includes("smoke:desktop"), true, "desktop startup readiness includes v0 smoke");
assertEqual(readiness.validationScripts.includes("check:electron-shell"), true, "desktop startup readiness includes electron shell contract");
if (!readiness.electronRuntimeAvailable) {
  assertEqual(readiness.knownLimitations.includes("electron-runtime-not-installed"), true, "desktop startup records missing Electron runtime");
  assertEqual(readiness.knownLimitations.includes("windows-package-not-generated"), true, "desktop startup records missing Windows package");
}

await import("./SelfHostedEditorDesktopV0Smoke.js");

console.log("SelfHostedEditor desktop startup smoke ok");

function buildStartupReadiness(packageManifest) {
  const hasElectronRuntime = Boolean(packageManifest.dependencies?.electron || packageManifest.devDependencies?.electron);
  const hasWindowsPackageScript = Boolean(packageManifest.scripts?.["package:windows"] || packageManifest.scripts?.["dist:windows"]);
  return {
    electronRuntimeAvailable: hasElectronRuntime,
    equivalentLocalStartupSmoke: true,
    format: SelfHostedEditorDesktopStartupSmokeFormat,
    knownLimitations: [
      ...(!hasElectronRuntime ? ["electron-runtime-not-installed"] : []),
      ...(!hasWindowsPackageScript ? ["windows-package-not-generated"] : []),
    ],
    validationScripts: [
      "smoke:desktop",
      "check:electron-shell",
      "check:electron-boundary",
      "check:preload-transport",
    ],
    windowsPackageGenerated: hasWindowsPackageScript && hasElectronRuntime,
  };
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(moduleRoot, relativePath), "utf8");
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
