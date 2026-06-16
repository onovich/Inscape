import { app } from "electron";
import { SelfHostedEditorElectronAppEntry } from "../Desktop/ElectronAppEntry.js";
import {
  buildSelfHostedEditorBrowserWindowOptions,
  isSelfHostedEditorAllowedNavigation,
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
assertEqual(isSelfHostedEditorAllowedNavigation("file:///tmp/workbench.html"), true, "runtime probe file navigation");
assertEqual(isSelfHostedEditorAllowedNavigation("https://example.invalid"), false, "runtime probe external navigation");

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
