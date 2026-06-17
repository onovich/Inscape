import { app, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertSelfHostedEditorElectronGuiPreview } from "../Desktop/ElectronGuiPreviewSmokeAssertions.js";
import { registerSelfHostedEditorElectronApp } from "../Desktop/ElectronMain.js";
import {
  createSelfHostedEditorElectronWorkspaceLifecycle,
} from "../Desktop/ElectronWorkspaceLifecycle.js";

assertEqual(process.env.SELF_HOSTED_EDITOR_ELECTRON_AUTOSTART, "false", "GUI probe autostart guard");
assertEqual(process.env.SELF_HOSTED_EDITOR_ELECTRON_GUI_RECOVERY_PROBE, "true", "GUI probe guard");

void runProbe();

async function runProbe() {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-gui-recovery-"));
  const languageSessionCalls = [];
  try {
    await fs.mkdir(path.join(tempRoot, "story"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "story", "opening.inscape"),
      "# Opening\nNarrator: original GUI smoke text",
      "utf8"
    );

    const workspaceLifecycle = createSelfHostedEditorElectronWorkspaceLifecycle({
      autosaveDebounceMs: 50,
      autosaveIntervalMs: 25,
      languageSessionHandlers: createGuiRecoveryLanguageSessionHandlers(languageSessionCalls),
      selectWorkspaceRoot: async () => tempRoot,
      sessionId: "gui-recovery-smoke",
    });
    registerSelfHostedEditorElectronApp(app, {
      workspaceLifecycle,
    });

    console.log("GUI recovery probe: waiting for Electron app");
    await withTimeout(app.whenReady(), "Electron app ready", 5000);
    const browserWindow = await waitForBrowserWindow();
    await waitForWindowLoad(browserWindow);

    console.log("GUI recovery probe: checking preload API");
    const apiReady = await withTimeout(
      browserWindow.webContents.executeJavaScript(
        "Boolean(window.inscapeSelfHostedEditor?.workspace?.openFolder && window.inscapeSelfHostedEditor?.recovery?.restore)"
      ),
      "preload API availability"
    );
    assertEqual(apiReady, true, "GUI probe preload API is available");

    await assertSelfHostedEditorElectronGuiPreview(browserWindow, {
      label: "GUI recovery probe",
    });

    const openResult = await invokePreload(browserWindow, "workspace.openFolder", {
      dialogTitle: "GUI Recovery Smoke Workspace",
    });
    assertEqual(openResult.ok, true, "GUI probe opens workspace through preload");
    assertEqual(openResult.workspace.documentCount, 1, "GUI probe workspace document count");
    assertNotIncludes(JSON.stringify(openResult), "original GUI smoke text", "GUI probe open result is text-free");

    const readResult = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    assertEqual(readResult.ok, true, "GUI probe reads active document through preload");
    assertEqual(readResult.document.text, "# Opening\nNarrator: original GUI smoke text", "GUI probe explicit read returns text");

    const manualSaveText = "# Opening\nNarrator: GUI smoke manual save text";
    const manualSaveUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: readResult.document.revision,
      relativePath: "story/opening.inscape",
      text: manualSaveText,
    });
    assertEqual(manualSaveUpdate.ok, true, "GUI probe updates draft before manual save");
    const manualSaveResult = await invokePreload(browserWindow, "documentBuffer.save", {
      baseRevision: manualSaveUpdate.currentRevision,
      relativePath: "story/opening.inscape",
    });
    assertEqual(manualSaveResult.ok, true, "GUI probe manual save through preload ok");
    assertEqual(
      await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
      manualSaveText,
      "GUI probe manual save writes disk"
    );
    assertNotIncludes(JSON.stringify(manualSaveResult), "GUI smoke manual save text", "GUI probe manual save response is text-free");

    const autosaveRead = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    const autosaveText = "# Opening\nNarrator: GUI smoke autosave text";
    const autosaveUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: autosaveRead.document.revision,
      relativePath: "story/opening.inscape",
      text: autosaveText,
    });
    assertEqual(autosaveUpdate.ok, true, "GUI probe updates draft through preload");
    await waitForDiskText(path.join(tempRoot, "story", "opening.inscape"), autosaveText, "GUI probe autosave writes disk");
    workspaceLifecycle.stopAutosaveTimer();

    const restoreRead = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    const restoreText = "# Opening\nNarrator: GUI smoke restore text";
    const restoreUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: restoreRead.document.revision,
      relativePath: "story/opening.inscape",
      text: restoreText,
    });
    assertEqual(restoreUpdate.ok, true, "GUI probe writes restore snapshot");
    const restoreStatus = await invokePreload(browserWindow, "projectSession.status", {});
    const restoreItem = restoreStatus.recoveryStatus.items.find((item) => item.relativePath === "story/opening.inscape");
    assertEqual(Boolean(restoreItem), true, "GUI probe finds restore recovery item");
    const restoreResult = await invokePreload(browserWindow, "recovery.restore", {
      contentHash: restoreItem.contentHash,
      relativePath: "story/opening.inscape",
    });
    assertEqual(restoreResult.ok, true, "GUI probe restore action ok");
    assertEqual(restoreResult.action, "restore", "GUI probe restore action");
    assertEqual(
      await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
      restoreText,
      "GUI probe restore writes snapshot text to disk"
    );
    assertNotIncludes(JSON.stringify(restoreResult), "GUI smoke restore text", "GUI probe restore response is text-free");

    const directLanguageCallStart = languageSessionCalls.length;
    const diagnosticsResult = await invokePreload(browserWindow, "languageSession.diagnose", {
      scriptText: "# Stale\nNarrator: stale renderer diagnostics text",
    });
    assertEqual(diagnosticsResult.diagnostics[0].code, "GUI001", "GUI probe diagnostics result");
    assertNotIncludes(JSON.stringify(diagnosticsResult), "GUI smoke restore text", "GUI probe diagnostics response is text-free");
    const completionsResult = await invokePreload(browserWindow, "languageSession.completions", {
      scriptText: "# Stale\nNarrator: stale renderer completions text",
    });
    assertEqual(completionsResult.completions[0].label, "GuiRestoredTarget", "GUI probe completions result");
    assertNotIncludes(JSON.stringify(completionsResult), "GUI smoke restore text", "GUI probe completions response is text-free");
    const directLanguageCalls = languageSessionCalls.slice(directLanguageCallStart);
    assertEqual(directLanguageCalls.length, 2, "GUI probe direct language session call count");
    for (const call of directLanguageCalls) {
      assertEqual(call.payload.activeRelativePath, "story/opening.inscape", `GUI probe ${call.kind} active path`);
      assertEqual(call.payload.scriptText, restoreText, `GUI probe ${call.kind} uses restored current buffer`);
      assertEqual(call.payload.workspace.documents[0].text, restoreText, `GUI probe ${call.kind} workspace snapshot text`);
      assertNotIncludes(JSON.stringify(call.payload), "stale renderer", `GUI probe ${call.kind} ignores stale renderer text`);
    }

    const laterRead = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    const laterText = "# Opening\nNarrator: GUI smoke later text";
    const laterUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: laterRead.document.revision,
      relativePath: "story/opening.inscape",
      text: laterText,
    });
    assertEqual(laterUpdate.ok, true, "GUI probe writes later snapshot");
    const laterStatus = await invokePreload(browserWindow, "projectSession.status", {});
    const laterItem = laterStatus.recoveryStatus.items.find((item) => item.relativePath === "story/opening.inscape");
    const laterResult = await invokePreload(browserWindow, "recovery.later", {
      contentHash: laterItem.contentHash,
      relativePath: "story/opening.inscape",
    });
    assertEqual(laterResult.ok, true, "GUI probe later action ok");
    assertEqual(laterResult.recoveryStatus.items[0].actionState, "later", "GUI probe later keeps session action state");
    assertEqual(await fileExists(buildOpeningSnapshotPath(tempRoot)), true, "GUI probe later keeps snapshot file");
    assertNotIncludes(JSON.stringify(laterResult), "GUI smoke later text", "GUI probe later response is text-free");
    const discardResult = await invokePreload(browserWindow, "recovery.discard", {
      contentHash: laterItem.contentHash,
      relativePath: "story/opening.inscape",
    });
    assertEqual(discardResult.ok, true, "GUI probe discard action ok");
    assertEqual(await fileExists(buildOpeningSnapshotPath(tempRoot)), false, "GUI probe discard deletes snapshot file");
    assertNotIncludes(JSON.stringify(discardResult), "GUI smoke later text", "GUI probe discard response is text-free");

    browserWindow.destroy();
    console.log("SelfHostedEditor desktop GUI recovery probe ok");
    app.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    app.exit(1);
  } finally {
    await fs.rm(tempRoot, { force: true, recursive: true });
  }
}

function createGuiRecoveryLanguageSessionHandlers(calls) {
  return Object.freeze({
    async completions(payload = {}) {
      calls.push({ kind: "completions", payload });
      return {
        completions: [
          {
            kind: "node",
            label: "GuiRestoredTarget",
          },
        ],
        format: "inscape.language-server-project-completions",
      };
    },
    async "document-symbols"() {
      return {
        format: "inscape.language-server-document-symbols",
        symbols: [],
      };
    },
    async diagnostics(payload = {}) {
      calls.push({ kind: "diagnostics", payload });
      return {
        diagnostics: [
          {
            code: "GUI001",
            location: {
              character: 0,
              length: 1,
              line: 1,
              sourcePath: payload.activeRelativePath,
            },
            message: "GUI smoke diagnostic from current buffer.",
            severity: "info",
          },
        ],
        format: "inscape.language-server-project-diagnostics",
      };
    },
  });
}

async function invokePreload(browserWindow, methodPath, payload = {}) {
  const [groupName, methodName] = methodPath.split(".");
  return await withTimeout(
    browserWindow.webContents.executeJavaScript(
      `window.inscapeSelfHostedEditor.${groupName}.${methodName}(${JSON.stringify(payload)})`
    ),
    `preload method ${methodPath}`
  );
}

async function waitForBrowserWindow() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const browserWindow = BrowserWindow.getAllWindows()[0];
    if (browserWindow) {
      return browserWindow;
    }

    await delay(25);
  }

  throw new Error("GUI probe did not create a BrowserWindow.");
}

async function waitForWindowLoad(browserWindow) {
  if (!browserWindow.webContents.isLoading() && browserWindow.webContents.getURL()) {
    return;
  }

  await withTimeout(new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("GUI probe timed out waiting for Workbench load."));
    }, 10000);
    browserWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
      clearTimeout(timeout);
      reject(new Error(`GUI probe Workbench failed to load: ${errorCode} ${errorDescription}`));
    });
    browserWindow.webContents.once("did-finish-load", () => {
      clearTimeout(timeout);
      resolve();
    });
  }), "Workbench load", 12000);
}

async function waitForDiskText(filePath, expectedText, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const actualText = await fs.readFile(filePath, "utf8");
    if (actualText === expectedText) {
      return;
    }

    await delay(25);
  }

  throw new Error(label);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function buildOpeningSnapshotPath(workspaceRoot) {
  return path.join(
    workspaceRoot,
    ".inscape-workspace",
    "recovery",
    "story",
    "opening.inscape.snapshot.json"
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withTimeout(promise, label, timeoutMs = 5000) {
  let timeout = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`GUI probe timed out during ${label}.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotIncludes(text, unexpected, label) {
  if (String(text).includes(unexpected)) {
    throw new Error(`${label}: unexpected ${unexpected}`);
  }
}
