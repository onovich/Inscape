import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SelfHostedEditorElectronAppEntry } from "./ElectronAppEntry.js";

const currentModulePath = fileURLToPath(import.meta.url);
const desktopRoot = path.dirname(currentModulePath);
const moduleRoot = path.resolve(desktopRoot, "..");

export const SelfHostedEditorElectronWindowDefaults = Object.freeze({
  height: 960,
  minHeight: 720,
  minWidth: 1100,
  title: SelfHostedEditorElectronAppEntry.appName,
  width: 1440,
});

export function createSelfHostedEditorBrowserWindow(options = {}) {
  const BrowserWindowCtor = options.BrowserWindowCtor || BrowserWindow;
  const browserWindow = new BrowserWindowCtor({
    height: SelfHostedEditorElectronWindowDefaults.height,
    minHeight: SelfHostedEditorElectronWindowDefaults.minHeight,
    minWidth: SelfHostedEditorElectronWindowDefaults.minWidth,
    show: false,
    title: SelfHostedEditorElectronWindowDefaults.title,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(desktopRoot, "ElectronPreload.js"),
      sandbox: true,
    },
    width: SelfHostedEditorElectronWindowDefaults.width,
  });

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  void browserWindow.loadFile(path.join(moduleRoot, "Resources", "Workbench", "SelfHostedEditorWorkbenchDocument.html"));
  return browserWindow;
}

export function registerSelfHostedEditorElectronApp(electronApp = app) {
  electronApp.whenReady().then(() => {
    createSelfHostedEditorBrowserWindow();
  });

  electronApp.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electronApp.quit();
    }
  });

  electronApp.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSelfHostedEditorBrowserWindow();
    }
  });
}

if (process.env.SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART !== "false") {
  registerSelfHostedEditorElectronApp();
}
