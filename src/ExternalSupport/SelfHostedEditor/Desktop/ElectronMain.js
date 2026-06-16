import { app, BrowserWindow, net, protocol } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerSelfHostedEditorBackendIpc } from "./ElectronBackendIpc.js";
import { SelfHostedEditorElectronAppEntry } from "./ElectronAppEntry.js";
import { createSelfHostedEditorElectronWorkspaceLifecycle } from "./ElectronWorkspaceLifecycle.js";

const currentModulePath = fileURLToPath(import.meta.url);
const desktopRoot = path.dirname(currentModulePath);
const moduleRoot = path.resolve(desktopRoot, "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");

export const SelfHostedEditorElectronProtocol = "inscape-self-hosted-editor";
export const SelfHostedEditorElectronProtocolHost = "app";
export const SelfHostedEditorElectronWorkbenchPath = "Resources/Workbench/SelfHostedEditorWorkbenchDocument.html";

const SelfHostedEditorElectronProtocolAssetPrefixes = Object.freeze([
  "Resources/",
  "Scripts/",
  "node_modules/monaco-editor/",
]);

let selfHostedEditorProtocolSchemeRegistered = false;

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

  void browserWindow.loadURL(buildSelfHostedEditorWorkbenchUrl());
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
    return parsedUrl.protocol === `${SelfHostedEditorElectronProtocol}:`
      && parsedUrl.hostname === SelfHostedEditorElectronProtocolHost;
  } catch {
    return false;
  }
}

export function buildSelfHostedEditorWorkbenchUrl() {
  return `${SelfHostedEditorElectronProtocol}://${SelfHostedEditorElectronProtocolHost}/${SelfHostedEditorElectronWorkbenchPath}`;
}

export function registerSelfHostedEditorProtocolScheme(electronProtocol = protocol) {
  if (selfHostedEditorProtocolSchemeRegistered) {
    return;
  }

  electronProtocol.registerSchemesAsPrivileged?.([
    {
      privileges: {
        corsEnabled: false,
        secure: true,
        standard: true,
        supportFetchAPI: true,
      },
      scheme: SelfHostedEditorElectronProtocol,
    },
  ]);
  selfHostedEditorProtocolSchemeRegistered = true;
}

export function registerSelfHostedEditorProtocol(electronProtocol = protocol, options = {}) {
  electronProtocol.handle(SelfHostedEditorElectronProtocol, (request) => {
    const filePath = resolveSelfHostedEditorProtocolFilePath(request.url, {
      moduleRoot: options.moduleRoot || moduleRoot,
      packaged: options.packaged ?? app.isPackaged,
      repoRoot: options.repoRoot || repoRoot,
      resourcesRoot: options.resourcesRoot || process.resourcesPath,
    });

    if (!filePath) {
      return new Response("SelfHostedEditor resource not found.", { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });
}

export function resolveSelfHostedEditorProtocolFilePath(requestUrl, options = {}) {
  let parsedUrl;
  try {
    parsedUrl = new URL(requestUrl);
  } catch {
    return null;
  }

  if (
    parsedUrl.protocol !== `${SelfHostedEditorElectronProtocol}:`
    || parsedUrl.hostname !== SelfHostedEditorElectronProtocolHost
  ) {
    return null;
  }

  const relativePath = normalizeSelfHostedEditorProtocolPath(parsedUrl.pathname);
  if (!relativePath) {
    return null;
  }

  if (relativePath.startsWith("samples/")) {
    return resolveSelfHostedEditorSampleFile(relativePath, options);
  }

  if (!SelfHostedEditorElectronProtocolAssetPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    return null;
  }

  const assetRoot = options.moduleRoot || moduleRoot;
  return resolveFileInsideRoot(assetRoot, relativePath);
}

function normalizeSelfHostedEditorProtocolPath(urlPathname) {
  const normalizedPath = decodeURIComponent(urlPathname || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!normalizedPath) {
    return SelfHostedEditorElectronWorkbenchPath;
  }

  if (
    normalizedPath.includes("\0")
    || normalizedPath.split("/").some((segment) => segment === ".." || segment === "")
  ) {
    return "";
  }

  return normalizedPath;
}

function resolveSelfHostedEditorSampleFile(relativePath, options) {
  const sampleSubPath = relativePath.slice("samples/".length);
  const sampleRoot = options.packaged
    ? path.join(options.resourcesRoot || process.resourcesPath, "samples")
    : path.join(options.repoRoot || repoRoot, "samples");

  return resolveFileInsideRoot(sampleRoot, sampleSubPath);
}

function resolveFileInsideRoot(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, ...relativePath.split("/"));
  const relativeToRoot = path.relative(resolvedRoot, resolvedPath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return resolvedPath;
}

export function registerSelfHostedEditorElectronApp(electronApp = app, options = {}) {
  registerSelfHostedEditorProtocolScheme();
  const workspaceLifecycle = options.workspaceLifecycle || createSelfHostedEditorElectronWorkspaceLifecycle(options);
  registerSelfHostedEditorBackendIpc(undefined, {
    ...options,
    sessionStore: options.sessionStore || workspaceLifecycle.sessionStore,
  });

  electronApp.whenReady().then(() => {
    registerSelfHostedEditorProtocol();
    workspaceLifecycle.startAutosaveTimer();
    const browserWindow = createSelfHostedEditorBrowserWindow(options);
    workspaceLifecycle.registerBrowserWindow(browserWindow);
  });

  workspaceLifecycle.registerAppLifecycle(electronApp);

  electronApp.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electronApp.quit();
    }
  });

  electronApp.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const browserWindow = createSelfHostedEditorBrowserWindow(options);
      workspaceLifecycle.registerBrowserWindow(browserWindow);
    }
  });
}

registerSelfHostedEditorProtocolScheme();

if (process.env.SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART !== "false") {
  registerSelfHostedEditorElectronApp();
}
