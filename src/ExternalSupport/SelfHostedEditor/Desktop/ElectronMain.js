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

export function buildSelfHostedEditorBrowserWindowOptions() {
  return {
    height: SelfHostedEditorElectronWindowDefaults.height,
    minHeight: SelfHostedEditorElectronWindowDefaults.minHeight,
    minWidth: SelfHostedEditorElectronWindowDefaults.minWidth,
    show: false,
    title: SelfHostedEditorElectronWindowDefaults.title,
    webPreferences: {
      allowRunningInsecureContent: false,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      nodeIntegrationInWorker: false,
      preload: path.join(desktopRoot, "ElectronPreload.js"),
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
    width: SelfHostedEditorElectronWindowDefaults.width,
  };
}

export function createSelfHostedEditorBrowserWindow(options = {}) {
  const BrowserWindowCtor = options.BrowserWindowCtor || BrowserWindow;
  const browserWindow = new BrowserWindowCtor(buildSelfHostedEditorBrowserWindowOptions());
  applySelfHostedEditorWindowSecurity(browserWindow);

  browserWindow.once("ready-to-show", () => {
    browserWindow.show();
  });

  void browserWindow.loadFile(path.join(moduleRoot, "Resources", "Workbench", "SelfHostedEditorWorkbenchDocument.html"));
  return browserWindow;
}

export function applySelfHostedEditorWindowSecurity(browserWindow) {
  browserWindow.webContents?.setWindowOpenHandler?.(() => ({ action: "deny" }));
  browserWindow.webContents?.on?.("will-navigate", (event, navigationUrl) => {
    if (!isSelfHostedEditorAllowedNavigation(navigationUrl)) {
      event.preventDefault();
    }
  });
}

export function isSelfHostedEditorAllowedNavigation(navigationUrl) {
  try {
    const parsedUrl = new URL(navigationUrl);
    return parsedUrl.protocol === "file:";
  } catch {
    return false;
  }
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
