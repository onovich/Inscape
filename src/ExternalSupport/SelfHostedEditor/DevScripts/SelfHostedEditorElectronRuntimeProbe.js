import { app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SelfHostedEditorElectronAppEntry } from "../Desktop/ElectronAppEntry.js";
import {
  buildSelfHostedEditorWorkbenchUrl,
  buildSelfHostedEditorBrowserWindowOptions,
  isSelfHostedEditorAllowedNavigation,
  resolveSelfHostedEditorProtocolFilePath,
} from "../Desktop/ElectronMain.js";

assertEqual(process.env.SELF_HOSTED_EDITOR_ELECTRON_RUNTIME_PROBE, "true", "runtime probe guard");
assertEqual(process.env.SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART, "false", "runtime probe autostart guard");
assertEqual(typeof app.whenReady, "function", "runtime probe Electron app contract");
assertEqual(SelfHostedEditorElectronAppEntry.appName, "Inscape SelfHostedEditor", "desktop app name");

const windowOptions = buildSelfHostedEditorBrowserWindowOptions();
assertEqual(windowOptions.webPreferences?.contextIsolation, true, "runtime probe context isolation");
assertEqual(windowOptions.webPreferences?.nodeIntegration, false, "runtime probe node integration");
assertEqual(windowOptions.webPreferences?.nodeIntegrationInWorker, false, "runtime probe worker node integration");
assertEqual(windowOptions.webPreferences?.sandbox, true, "runtime probe sandbox");
assertEqual(windowOptions.webPreferences?.webSecurity, true, "runtime probe web security");
assertEqual(windowOptions.webPreferences?.webviewTag, false, "runtime probe webview tag");
assert(windowOptions.webPreferences?.preload?.endsWith("ElectronPreload.js"), "runtime probe preload path");
assertEqual(buildSelfHostedEditorWorkbenchUrl(), "inscape-self-hosted-editor://app/Resources/Workbench/SelfHostedEditorWorkbenchDocument.html", "runtime probe workbench URL");
assertEqual(isSelfHostedEditorAllowedNavigation("inscape-self-hosted-editor://app/Resources/Workbench/SelfHostedEditorWorkbenchDocument.html"), true, "runtime probe app protocol navigation");
assertEqual(isSelfHostedEditorAllowedNavigation("file:///tmp/workbench.html"), false, "runtime probe rejects file navigation");
assertEqual(isSelfHostedEditorAllowedNavigation("https://example.invalid"), false, "runtime probe external navigation");

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const resolvedStylePath = resolveSelfHostedEditorProtocolFilePath("inscape-self-hosted-editor://app/Resources/Styles/SelfHostedEditorWorkbench.css", {
  moduleRoot,
});
assert(resolvedStylePath?.replace(/\\/g, "/").endsWith("/Resources/Styles/SelfHostedEditorWorkbench.css"), "runtime probe style protocol path");
const resolvedScriptPath = resolveSelfHostedEditorProtocolFilePath("inscape-self-hosted-editor://app/Scripts/Entries/SelfHostedEditorAppEntry.js", {
  moduleRoot,
});
assert(resolvedScriptPath?.replace(/\\/g, "/").endsWith("/Scripts/Entries/SelfHostedEditorAppEntry.js"), "runtime probe script protocol path");
const resolvedSamplePath = resolveSelfHostedEditorProtocolFilePath("inscape-self-hosted-editor://app/samples/court-loop.inscape", {
  moduleRoot,
  packaged: false,
  repoRoot,
});
assert(resolvedSamplePath?.replace(/\\/g, "/").endsWith("/samples/court-loop.inscape"), "runtime probe sample protocol path");
assertEqual(resolveSelfHostedEditorProtocolFilePath("inscape-self-hosted-editor://app/DevScripts/SelfHostedEditorDesktopPackageSmoke.js", {
  moduleRoot,
}), null, "runtime probe rejects DevScripts protocol path");
assertEqual(resolveSelfHostedEditorProtocolFilePath("inscape-self-hosted-editor://app/../AGENTS.md", {
  moduleRoot,
}), null, "runtime probe rejects traversal protocol path");

console.log("SelfHostedEditor electron runtime probe ok");
process.exit(0);

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
