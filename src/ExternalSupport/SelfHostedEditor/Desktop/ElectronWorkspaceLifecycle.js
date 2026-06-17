import {
  createSelfHostedEditorElectronWorkspaceSessionStore,
} from "./ElectronWorkspaceSessionStore.js";

export const SelfHostedEditorElectronLifecycleStatusFormat = "inscape.self-hosted-editor.electron-lifecycle-status";
export const SelfHostedEditorElectronLifecycleFormatVersion = 1;

export const SelfHostedEditorElectronLifecycleDefaults = Object.freeze({
  autosaveDebounceMs: 1500,
  autosaveIntervalMs: 1000,
});

export class SelfHostedEditorElectronWorkspaceLifecycle {
  #appQuitContinuation = false;
  #autosaveDebounceMs;
  #autosaveIntervalMs;
  #autosaveTimer = null;
  #clearInterval;
  #flushInProgress = null;
  #lastAutosaveResult = null;
  #lastFlushResult = null;
  #sessionStore;
  #setInterval;
  #windowCloseContinuations = new WeakSet();

  constructor(options = {}) {
    this.#autosaveDebounceMs = normalizePositiveInteger(
      options.autosaveDebounceMs,
      SelfHostedEditorElectronLifecycleDefaults.autosaveDebounceMs
    );
    this.#autosaveIntervalMs = normalizePositiveInteger(
      options.autosaveIntervalMs,
      SelfHostedEditorElectronLifecycleDefaults.autosaveIntervalMs
    );
    this.#clearInterval = options.clearInterval || clearInterval;
    this.#sessionStore = options.sessionStore || createSelfHostedEditorElectronWorkspaceSessionStore(options);
    this.#setInterval = options.setInterval || setInterval;
  }

  get sessionStore() {
    return this.#sessionStore;
  }

  startAutosaveTimer() {
    if (this.#autosaveTimer) {
      return this.getStatus({ reason: "autosave-timer-already-running" });
    }

    this.#autosaveTimer = this.#setInterval(() => {
      void this.runAutosaveTick();
    }, this.#autosaveIntervalMs);

    return this.getStatus({ reason: "autosave-timer-started" });
  }

  stopAutosaveTimer() {
    if (this.#autosaveTimer) {
      this.#clearInterval(this.#autosaveTimer);
      this.#autosaveTimer = null;
    }

    return this.getStatus({ reason: "autosave-timer-stopped" });
  }

  async runAutosaveTick(payload = {}) {
    this.#lastAutosaveResult = await this.#sessionStore.runAutosave({
      debounceMs: this.#autosaveDebounceMs,
      ...payload,
    });
    return this.#lastAutosaveResult;
  }

  registerAppLifecycle(electronApp) {
    if (!electronApp?.on) {
      return this.getStatus({ reason: "electron-app-unavailable" });
    }

    electronApp.on("before-quit", (event) => {
      void this.handleAppBeforeQuit(event, electronApp);
    });
    return this.getStatus({ reason: "app-lifecycle-registered" });
  }

  registerBrowserWindow(browserWindow) {
    if (!browserWindow?.on) {
      return this.getStatus({ reason: "browser-window-unavailable" });
    }

    browserWindow.on("close", (event) => {
      void this.handleWindowClose(event, browserWindow);
    });
    return this.getStatus({ reason: "window-lifecycle-registered" });
  }

  async handleWindowClose(event = {}, browserWindow = null) {
    if (browserWindow && this.#windowCloseContinuations.has(browserWindow)) {
      this.#windowCloseContinuations.delete(browserWindow);
      return null;
    }

    event.preventDefault?.();
    const flushResult = await this.flushForTrigger("close-window");
    if (canContinueAfterLifecycleFlush(flushResult) && browserWindow?.close) {
      await this.#sessionStore.dispose?.({
        trigger: "close-window",
      });
      this.#windowCloseContinuations.add(browserWindow);
      browserWindow.close();
    }

    return flushResult;
  }

  async handleAppBeforeQuit(event = {}, electronApp = null) {
    if (this.#appQuitContinuation) {
      return null;
    }

    event.preventDefault?.();
    this.stopAutosaveTimer();
    const flushResult = await this.flushForTrigger("app-exit");
    if (canContinueAfterLifecycleFlush(flushResult) && electronApp?.quit) {
      await this.#sessionStore.dispose?.({
        trigger: "app-exit",
      });
      this.#appQuitContinuation = true;
      electronApp.quit();
    }

    return flushResult;
  }

  async flushForTrigger(trigger, payload = {}) {
    if (this.#flushInProgress) {
      return await this.#flushInProgress;
    }

    this.#flushInProgress = this.#sessionStore.flushDirtyDocuments({
      ...payload,
      trigger,
    });
    try {
      this.#lastFlushResult = await this.#flushInProgress;
      return this.#lastFlushResult;
    } finally {
      this.#flushInProgress = null;
    }
  }

  getStatus(extra = {}) {
    return {
      autosaveDebounceMs: this.#autosaveDebounceMs,
      autosaveIntervalMs: this.#autosaveIntervalMs,
      autosaveTimerActive: Boolean(this.#autosaveTimer),
      format: SelfHostedEditorElectronLifecycleStatusFormat,
      formatVersion: SelfHostedEditorElectronLifecycleFormatVersion,
      lastAutosaveReason: this.#lastAutosaveResult?.reason || "",
      lastAutosaveSavedCount: this.#lastAutosaveResult?.savedCount || 0,
      lastFlushReason: this.#lastFlushResult?.reason || "",
      lastFlushSavedCount: this.#lastFlushResult?.savedCount || 0,
      lastFlushTrigger: this.#lastFlushResult?.trigger || "",
      payloadContentExposed: false,
      reason: extra.reason || "",
    };
  }
}

export function createSelfHostedEditorElectronWorkspaceLifecycle(options = {}) {
  return new SelfHostedEditorElectronWorkspaceLifecycle(options);
}

function canContinueAfterLifecycleFlush(result) {
  if (result?.reason === "workspace-not-open") {
    return true;
  }

  if (!result || result.ok !== true) {
    return false;
  }

  const finalPlan = result.finalPlan || result.flushPlan || {};
  return finalPlan.continuationBlocked !== true
    && (finalPlan.blockingIssues || []).length === 0
    && (finalPlan.visibleFailures || []).length === 0;
}

function normalizePositiveInteger(value, fallback) {
  const numericValue = Number(value ?? fallback);
  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return fallback;
  }

  return Math.floor(numericValue);
}
