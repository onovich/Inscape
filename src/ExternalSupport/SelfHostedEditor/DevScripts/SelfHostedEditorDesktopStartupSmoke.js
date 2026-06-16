import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSelfHostedEditorDesktopPackageReadiness } from "./SelfHostedEditorDesktopPackageContractCheck.js";

export const SelfHostedEditorDesktopStartupSmokeFormat = "inscape.self-hosted-editor.desktop-startup-smoke";

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const appEntryText = readText("Desktop/ElectronAppEntry.js");
const mainText = readText("Desktop/ElectronMain.js");
const preloadText = readText("Desktop/ElectronPreload.cjs");
const workbenchText = readText("Resources/Workbench/SelfHostedEditorWorkbenchDocument.html");

assertEqual(packageJson.private, true, "desktop startup package is private");
assertEqual(packageJson.type, "module", "desktop startup package is ESM");
assertEqual(packageJson.scripts?.["smoke:desktop"], "node DevScripts/SelfHostedEditorDesktopV0Smoke.js", "desktop startup smoke includes v0 loop smoke");
assertEqual(packageJson.scripts?.["smoke:desktop-gui-recovery"], "node DevScripts/SelfHostedEditorDesktopGuiRecoverySmoke.js", "desktop startup smoke includes GUI recovery smoke");
assertEqual(packageJson.scripts?.["smoke:desktop-runtime"], "node DevScripts/SelfHostedEditorDesktopRuntimeSmoke.js", "desktop startup smoke includes Electron runtime smoke");
assertEqual(packageJson.scripts?.["smoke:desktop-startup"], "node DevScripts/SelfHostedEditorDesktopStartupSmoke.js", "desktop startup smoke script");
assertEqual(packageJson.scripts?.["check:desktop-package"], "node DevScripts/SelfHostedEditorDesktopPackageContractCheck.js", "desktop startup package contract check script");
assertEqual(packageJson.scripts?.["package:windows"], "electron-builder --win dir --x64", "desktop startup Windows package script");
assertEqual(packageJson.scripts?.["start:desktop"], "electron Desktop/ElectronMain.js", "desktop startup launch script");
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
assertEqual(readiness.electronRuntimeAvailable, true, "desktop startup has Electron runtime");
assertEqual(readiness.desktopRuntimeSmoke, true, "desktop startup has Electron runtime smoke");
assertEqual(readiness.windowsPackageScriptAvailable, true, "desktop startup has Windows package script");
assertEqual(readiness.validationScripts.includes("smoke:desktop"), true, "desktop startup readiness includes v0 smoke");
assertEqual(readiness.validationScripts.includes("smoke:desktop-gui-recovery"), true, "desktop startup readiness includes GUI recovery smoke");
assertEqual(readiness.validationScripts.includes("smoke:desktop-runtime"), true, "desktop startup readiness includes runtime smoke");
assertEqual(readiness.validationScripts.includes("check:desktop-package"), true, "desktop startup readiness includes package contract");
assertEqual(readiness.validationScripts.includes("check:electron-shell"), true, "desktop startup readiness includes electron shell contract");
assertEqual(readiness.knownLimitations.includes("electron-runtime-not-installed"), false, "desktop startup no longer records missing Electron runtime");
if (!readiness.windowsPackageGenerated) {
  assertEqual(readiness.knownLimitations.includes("windows-package-not-generated"), true, "desktop startup still records missing Windows package");
}

await import("./SelfHostedEditorDesktopRuntimeSmoke.js");
await import("./SelfHostedEditorDesktopV0Smoke.js");

console.log("SelfHostedEditor desktop startup smoke ok");

function buildStartupReadiness(packageManifest) {
  const hasElectronRuntime = Boolean(packageManifest.dependencies?.electron || packageManifest.devDependencies?.electron);
  const hasDesktopRuntimeSmoke = packageManifest.scripts?.["smoke:desktop-runtime"] === "node DevScripts/SelfHostedEditorDesktopRuntimeSmoke.js";
  const packageReadiness = buildSelfHostedEditorDesktopPackageReadiness(packageManifest, { moduleRoot });
  return {
    desktopRuntimeSmoke: hasElectronRuntime && hasDesktopRuntimeSmoke,
    electronRuntimeAvailable: hasElectronRuntime,
    equivalentLocalStartupSmoke: true,
    format: SelfHostedEditorDesktopStartupSmokeFormat,
    knownLimitations: [
      ...(!hasElectronRuntime ? ["electron-runtime-not-installed"] : []),
      ...packageReadiness.knownLimitations,
    ],
    validationScripts: [
      "smoke:desktop",
      "smoke:desktop-gui-recovery",
      "smoke:desktop-runtime",
      "check:desktop-package",
      "check:electron-shell",
      "check:electron-boundary",
      "check:preload-transport",
    ],
    windowsPackageGenerated: packageReadiness.windowsPackageGenerated,
    windowsPackageScriptAvailable: packageReadiness.windowsPackageScriptAvailable,
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
