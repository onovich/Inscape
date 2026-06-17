import fs from "node:fs/promises";
import path from "node:path";
import { assertSelfHostedEditorElectronGuiPreview } from "./ElectronGuiPreviewSmokeAssertions.js";

export const SelfHostedEditorElectronPackagedGuiSmokeFormat = "inscape.self-hosted-editor.electron-packaged-gui-smoke";

export function isSelfHostedEditorElectronPackagedGuiSmokeEnabled(env = process.env) {
  return env.SELF_HOSTED_EDITOR_ELECTRON_PACKAGED_GUI_SMOKE === "true";
}

export function buildSelfHostedEditorElectronPackagedGuiSmokeOptions(env = process.env) {
  if (!isSelfHostedEditorElectronPackagedGuiSmokeEnabled(env)) {
    return {};
  }

  const state = createSelfHostedEditorElectronPackagedGuiSmokeState(env);
  return {
    autosaveDebounceMs: 50,
    autosaveIntervalMs: 25,
    languageSessionHandlers: state.languageSessionHandlers,
    packagedGuiSmoke: state,
    selectWorkspaceRoot: async () => state.workspaceRoot,
    showOnReady: false,
  };
}

export function createSelfHostedEditorElectronPackagedGuiSmokeState(env = process.env) {
  const state = {
    languageSessionCalls: [],
    resultPath: String(env.SELF_HOSTED_EDITOR_ELECTRON_SMOKE_RESULT_PATH || ""),
    workspaceRoot: String(env.SELF_HOSTED_EDITOR_ELECTRON_SMOKE_WORKSPACE_ROOT || ""),
  };
  state.languageSessionHandlers = Object.freeze({
    async completions(payload = {}) {
      state.languageSessionCalls.push({ kind: "completions", payload });
      return {
        completions: [
          {
            kind: "node",
            label: "PackagedRestoredTarget",
          },
        ],
        format: "inscape.language-server-project-completions",
      };
    },
    async diagnostics(payload = {}) {
      state.languageSessionCalls.push({ kind: "diagnostics", payload });
      return {
        diagnostics: [
          {
            code: "PKG001",
            location: {
              character: 0,
              length: 1,
              line: 1,
              sourcePath: payload.activeRelativePath,
            },
            message: "Packaged GUI smoke diagnostic from current buffer.",
            severity: "info",
          },
        ],
        format: "inscape.language-server-project-diagnostics",
      };
    },
    async "document-symbols"() {
      return {
        format: "inscape.language-server-document-symbols",
        symbols: [],
      };
    },
    async definition() {
      return {
        definition: null,
        format: "inscape.language-server-project-definition",
      };
    },
    async hover() {
      return {
        format: "inscape.language-server-project-hover",
        hover: null,
      };
    },
    async references() {
      return {
        format: "inscape.language-server-project-references",
        references: [],
      };
    },
  });
  return state;
}

export async function runSelfHostedEditorElectronPackagedGuiSmoke({
  browserWindow,
  electronApp,
  state,
} = {}) {
  try {
    assert(Boolean(browserWindow?.webContents), "Packaged GUI smoke requires a BrowserWindow.");
    assert(Boolean(electronApp?.exit), "Packaged GUI smoke requires an Electron app.");
    assert(Boolean(state?.workspaceRoot), "Packaged GUI smoke workspace root is required.");
    assert(Boolean(state?.resultPath), "Packaged GUI smoke result path is required.");

    await waitForWindowLoad(browserWindow);
    const apiReady = await invokeJavaScript(
      browserWindow,
      "Boolean(window.inscapeSelfHostedEditor?.workspace?.openFolder && window.inscapeSelfHostedEditor?.languageSession?.diagnose)"
    );
    assertEqual(apiReady, true, "Packaged GUI smoke preload API is available");

    const previewResult = await assertSelfHostedEditorElectronGuiPreview(browserWindow, {
      label: "Packaged GUI smoke",
    });

    const openResult = await invokePreload(browserWindow, "workspace.openFolder", {
      dialogTitle: "Packaged GUI Smoke Workspace",
    });
    assertEqual(openResult.ok, true, "Packaged GUI smoke opens workspace");
    assertNotIncludes(JSON.stringify(openResult), "packaged original text", "Packaged GUI smoke open response is text-free");

    const readResult = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    assertEqual(readResult.ok, true, "Packaged GUI smoke reads document");

    const manualSaveText = "# Opening\nNarrator: packaged manual save text";
    const manualUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: readResult.document.revision,
      relativePath: "story/opening.inscape",
      text: manualSaveText,
    });
    assertEqual(manualUpdate.ok, true, "Packaged GUI smoke updates manual save draft");
    const manualSave = await invokePreload(browserWindow, "documentBuffer.save", {
      baseRevision: manualUpdate.currentRevision,
      relativePath: "story/opening.inscape",
    });
    assertEqual(manualSave.ok, true, "Packaged GUI smoke manual save ok");
    assertEqual(await readOpeningText(state.workspaceRoot), manualSaveText, "Packaged GUI smoke manual save writes disk");
    assertNotIncludes(JSON.stringify(manualSave), "packaged manual save text", "Packaged GUI smoke save response is text-free");

    const restoreRead = await invokePreload(browserWindow, "documentBuffer.read", {
      relativePath: "story/opening.inscape",
    });
    const restoreText = "# Opening\nNarrator: packaged restore text";
    const restoreUpdate = await invokePreload(browserWindow, "documentBuffer.updateDraft", {
      baseRevision: restoreRead.document.revision,
      relativePath: "story/opening.inscape",
      text: restoreText,
    });
    assertEqual(restoreUpdate.ok, true, "Packaged GUI smoke writes restore snapshot");
    const restoreStatus = await invokePreload(browserWindow, "projectSession.status", {});
    const restoreItem = restoreStatus.recoveryStatus.items.find((item) => item.relativePath === "story/opening.inscape");
    assertEqual(Boolean(restoreItem), true, "Packaged GUI smoke finds recovery item");
    const restoreResult = await invokePreload(browserWindow, "recovery.restore", {
      contentHash: restoreItem.contentHash,
      relativePath: "story/opening.inscape",
    });
    assertEqual(restoreResult.ok, true, "Packaged GUI smoke restore ok");
    assertEqual(await readOpeningText(state.workspaceRoot), restoreText, "Packaged GUI smoke restore writes disk");
    assertNotIncludes(JSON.stringify(restoreResult), "packaged restore text", "Packaged GUI smoke restore response is text-free");

    const directLanguageCallStart = state.languageSessionCalls.length;
    const diagnosticsResult = await invokePreload(browserWindow, "languageSession.diagnose", {
      scriptText: "# Stale\nNarrator: packaged stale diagnostics text",
    });
    assertEqual(diagnosticsResult.diagnostics[0].code, "PKG001", "Packaged GUI smoke diagnostics result");
    const completionsResult = await invokePreload(browserWindow, "languageSession.completions", {
      scriptText: "# Stale\nNarrator: packaged stale completions text",
    });
    assertEqual(completionsResult.completions[0].label, "PackagedRestoredTarget", "Packaged GUI smoke completions result");
    const directLanguageCalls = state.languageSessionCalls.slice(directLanguageCallStart);
    assertEqual(directLanguageCalls.length, 2, "Packaged GUI smoke direct language call count");
    for (const call of directLanguageCalls) {
      const activePayloadDocument = call.payload.workspace.documents.find((document) => document.relativePath === call.payload.activeRelativePath);
      assertEqual(call.payload.activeRelativePath, "story/opening.inscape", `Packaged GUI smoke ${call.kind} active path`);
      assertEqual(call.payload.scriptText, restoreText, `Packaged GUI smoke ${call.kind} uses restored buffer`);
      assertEqual(activePayloadDocument.text, restoreText, `Packaged GUI smoke ${call.kind} snapshot text`);
      assertNotIncludes(JSON.stringify(call.payload), "packaged stale", `Packaged GUI smoke ${call.kind} ignores stale renderer text`);
    }

    await writeSmokeResult(state, {
      format: SelfHostedEditorElectronPackagedGuiSmokeFormat,
      languageCallCount: directLanguageCalls.length,
      ok: true,
      preview: previewResult,
      reason: "",
    });
    browserWindow.destroy();
    electronApp.exit(0);
  } catch (error) {
    await writeSmokeResult(state, {
      error: error instanceof Error ? error.stack || error.message : String(error),
      format: SelfHostedEditorElectronPackagedGuiSmokeFormat,
      ok: false,
      reason: "packaged-gui-smoke-failed",
    });
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    electronApp?.exit?.(1);
  }
}

async function waitForWindowLoad(browserWindow) {
  if (!browserWindow.webContents.isLoading() && browserWindow.webContents.getURL()) {
    return;
  }

  await withTimeout(new Promise((resolve, reject) => {
    browserWindow.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
      reject(new Error(`Packaged GUI smoke Workbench failed to load: ${errorCode} ${errorDescription}`));
    });
    browserWindow.webContents.once("did-finish-load", () => {
      resolve();
    });
  }), "Workbench load", 12000);
}

async function invokePreload(browserWindow, methodPath, payload = {}) {
  const [groupName, methodName] = methodPath.split(".");
  return await invokeJavaScript(
    browserWindow,
    `window.inscapeSelfHostedEditor.${groupName}.${methodName}(${JSON.stringify(payload)})`
  );
}

async function invokeJavaScript(browserWindow, script) {
  return await withTimeout(
    browserWindow.webContents.executeJavaScript(script),
    "renderer JavaScript"
  );
}

async function readOpeningText(workspaceRoot) {
  return await fs.readFile(path.join(workspaceRoot, "story", "opening.inscape"), "utf8");
}

async function writeSmokeResult(state, result) {
  if (!state?.resultPath) {
    return;
  }

  await fs.mkdir(path.dirname(state.resultPath), { recursive: true });
  await fs.writeFile(state.resultPath, JSON.stringify(result, null, 2), "utf8");
}

async function withTimeout(promise, label, timeoutMs = 5000) {
  let timeout = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Packaged GUI smoke timed out during ${label}.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
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
