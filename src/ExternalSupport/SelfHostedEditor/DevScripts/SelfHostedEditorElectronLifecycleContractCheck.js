import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createSelfHostedEditorElectronWorkspaceLifecycle,
  SelfHostedEditorElectronLifecycleStatusFormat,
} from "../Desktop/ElectronWorkspaceLifecycle.js";
import {
  SelfHostedEditorElectronAutosaveResultFormat,
  SelfHostedEditorElectronFlushResultFormat,
} from "../Desktop/ElectronWorkspaceSessionStore.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-lifecycle-"));

try {
  const workspaceA = path.join(tempRoot, "WorkspaceA");
  const workspaceB = path.join(tempRoot, "WorkspaceB");
  await fs.mkdir(path.join(workspaceA, "story"), { recursive: true });
  await fs.mkdir(path.join(workspaceB, "story"), { recursive: true });
  await fs.writeFile(
    path.join(workspaceA, "story", "opening.inscape"),
    "# Opening\nNarrator: original A",
    "utf8"
  );
  await fs.writeFile(
    path.join(workspaceB, "story", "branch.inscape"),
    "# Branch\nNarrator: original B",
    "utf8"
  );

  let now = 1000;
  const selectedWorkspaceRoots = [workspaceA, workspaceB];
  const intervalRegistrations = [];
  const clearedIntervals = [];
  const lifecycle = createSelfHostedEditorElectronWorkspaceLifecycle({
    autosaveDebounceMs: 1000,
    autosaveIntervalMs: 250,
    clearInterval: (timer) => {
      clearedIntervals.push(timer);
    },
    now: () => now,
    selectWorkspaceRoot: async () => selectedWorkspaceRoots.shift() || workspaceA,
    setInterval: (handler, intervalMs) => {
      const timer = {
        handler,
        intervalMs,
        token: `timer-${intervalRegistrations.length + 1}`,
      };
      intervalRegistrations.push(timer);
      return timer;
    },
  });
  const sessionStore = lifecycle.sessionStore;
  const disposeCalls = [];
  const originalDispose = sessionStore.dispose.bind(sessionStore);
  sessionStore.dispose = async (payload = {}) => {
    disposeCalls.push(payload);
    await originalDispose(payload);
  };

  const timerStatus = lifecycle.startAutosaveTimer();
  assertEqual(timerStatus.format, SelfHostedEditorElectronLifecycleStatusFormat, "lifecycle status format");
  assertEqual(timerStatus.autosaveTimerActive, true, "autosave timer starts");
  assertEqual(intervalRegistrations.length, 1, "autosave timer registered once");
  assertEqual(intervalRegistrations[0].intervalMs, 250, "autosave timer interval");
  assertEqual(lifecycle.startAutosaveTimer().reason, "autosave-timer-already-running", "autosave timer is single instance");

  const openA = await sessionStore.openFolder({});
  assertEqual(openA.ok, true, "open first workspace");
  assertEqual(openA.switchFlush, null, "initial open has no switch flush");

  const autosaveRead = sessionStore.readDocument({
    relativePath: "story/opening.inscape",
  });
  assertEqual(autosaveRead.ok, true, "read autosave target");
  const autosaveUpdate = await sessionStore.updateDraft({
    baseRevision: autosaveRead.document.revision,
    relativePath: "story/opening.inscape",
    text: "# Opening\nNarrator: secret autosave lifecycle text",
  });
  assertEqual(autosaveUpdate.ok, true, "update autosave target");
  const autosaveSnapshotPath = path.join(
    workspaceA,
    ".inscape-workspace",
    "recovery",
    "story",
    "opening.inscape.snapshot.json"
  );
  assertEqual(await fileExists(autosaveSnapshotPath), true, "autosave lifecycle writes recovery snapshot");

  now = 1500;
  const waitingAutosave = await lifecycle.runAutosaveTick();
  assertEqual(waitingAutosave.format, SelfHostedEditorElectronAutosaveResultFormat, "waiting autosave result format");
  assertEqual(waitingAutosave.autosavePlan.ready, false, "waiting autosave waits for idle debounce");
  assertEqual(waitingAutosave.savedCount, 0, "waiting autosave does not save");
  assertEqual(
    await fs.readFile(path.join(workspaceA, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: original A",
    "waiting autosave leaves disk unchanged"
  );

  now = 2000;
  const readyAutosave = await lifecycle.runAutosaveTick();
  assertEqual(readyAutosave.ok, true, "ready autosave ok");
  assertEqual(readyAutosave.savedCount, 1, "ready autosave saves dirty document");
  assertEqual(
    await fs.readFile(path.join(workspaceA, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret autosave lifecycle text",
    "ready autosave writes disk"
  );
  assertEqual(await fileExists(autosaveSnapshotPath), false, "ready autosave cleans recovery snapshot");

  const closeRead = sessionStore.readDocument({
    relativePath: "story/opening.inscape",
  });
  const closeUpdate = await sessionStore.updateDraft({
    baseRevision: closeRead.document.revision,
    relativePath: "story/opening.inscape",
    text: "# Opening\nNarrator: secret close flush text",
  });
  assertEqual(closeUpdate.ok, true, "update close target");
  const fakeWindow = createFakeWindow();
  const windowRegisterStatus = lifecycle.registerBrowserWindow(fakeWindow);
  assertEqual(windowRegisterStatus.reason, "window-lifecycle-registered", "window lifecycle registered");
  assertEqual(typeof fakeWindow.handlers.close, "function", "window close handler registered");
  const closeEvent = createFakePreventableEvent();
  const closeFlush = await lifecycle.handleWindowClose(closeEvent, fakeWindow);
  assertEqual(closeEvent.prevented, true, "window close prevents default before flush");
  assertEqual(closeFlush.format, SelfHostedEditorElectronFlushResultFormat, "window close flush result format");
  assertEqual(closeFlush.trigger, "close-window", "window close flush trigger");
  assertEqual(disposeCalls[0].trigger, "close-window", "window close disposes backend sessions");
  assertEqual(fakeWindow.closeCount, 1, "window closes after successful flush");
  assertEqual(
    await fs.readFile(path.join(workspaceA, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret close flush text",
    "window close flush writes disk"
  );
  assertEqual(
    await lifecycle.handleWindowClose(createThrowingPreventableEvent(), fakeWindow),
    null,
    "continued window close is allowed without a second flush"
  );

  const switchRead = sessionStore.readDocument({
    relativePath: "story/opening.inscape",
  });
  const switchUpdate = await sessionStore.updateDraft({
    baseRevision: switchRead.document.revision,
    relativePath: "story/opening.inscape",
    text: "# Opening\nNarrator: secret switch flush text",
  });
  assertEqual(switchUpdate.ok, true, "update switch target");
  const openB = await sessionStore.openFolder({});
  assertEqual(openB.ok, true, "switch workspace opens next workspace");
  assertEqual(openB.switchFlush.format, SelfHostedEditorElectronFlushResultFormat, "switch workspace flush result format");
  assertEqual(openB.switchFlush.trigger, "switch-workspace", "switch workspace flush trigger");
  assertEqual(openB.switchFlush.savedCount, 1, "switch workspace saves dirty document");
  assertEqual(
    await fs.readFile(path.join(workspaceA, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret switch flush text",
    "switch workspace flush writes old workspace disk"
  );
  assertEqual(openB.workspace.workspaceName, "WorkspaceB", "switch workspace opens selected workspace");

  const appExitRead = sessionStore.readDocument({
    relativePath: "story/branch.inscape",
  });
  const appExitUpdate = await sessionStore.updateDraft({
    baseRevision: appExitRead.document.revision,
    relativePath: "story/branch.inscape",
    text: "# Branch\nNarrator: secret app exit lifecycle text",
  });
  assertEqual(appExitUpdate.ok, true, "update app-exit target");
  const fakeApp = createFakeApp();
  const appRegisterStatus = lifecycle.registerAppLifecycle(fakeApp);
  assertEqual(appRegisterStatus.reason, "app-lifecycle-registered", "app lifecycle registered");
  assertEqual(typeof fakeApp.handlers["before-quit"], "function", "before-quit handler registered");
  const appEvent = createFakePreventableEvent();
  const appExitFlush = await lifecycle.handleAppBeforeQuit(appEvent, fakeApp);
  assertEqual(appEvent.prevented, true, "app exit prevents default before flush");
  assertEqual(appExitFlush.format, SelfHostedEditorElectronFlushResultFormat, "app-exit flush result format");
  assertEqual(appExitFlush.trigger, "app-exit", "app-exit flush trigger");
  assertEqual(disposeCalls[1].trigger, "app-exit", "app exit disposes backend sessions");
  assertEqual(fakeApp.quitCount, 1, "app quit resumes after successful flush");
  assertEqual(clearedIntervals.length, 1, "app exit stops autosave timer");
  assertEqual(
    await fs.readFile(path.join(workspaceB, "story", "branch.inscape"), "utf8"),
    "# Branch\nNarrator: secret app exit lifecycle text",
    "app-exit flush writes disk"
  );
  assertEqual(
    await lifecycle.handleAppBeforeQuit(createThrowingPreventableEvent(), fakeApp),
    null,
    "continued app quit is allowed without a second flush"
  );

  const finalStatus = lifecycle.getStatus();
  assertEqual(finalStatus.autosaveTimerActive, false, "autosave timer stopped in final status");
  assertEqual(JSON.stringify(finalStatus).includes("secret"), false, "lifecycle status is text-free");

  console.log("SelfHostedEditor Electron lifecycle contract ok");
} finally {
  await fs.rm(tempRoot, { force: true, recursive: true });
}

function createFakeWindow() {
  return {
    closeCount: 0,
    handlers: {},
    close() {
      this.closeCount += 1;
    },
    on(eventName, handler) {
      this.handlers[eventName] = handler;
    },
  };
}

function createFakeApp() {
  return {
    handlers: {},
    quitCount: 0,
    on(eventName, handler) {
      this.handlers[eventName] = handler;
    },
    quit() {
      this.quitCount += 1;
    },
  };
}

function createFakePreventableEvent() {
  return {
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  };
}

function createThrowingPreventableEvent() {
  return {
    preventDefault() {
      throw new Error("continued close must not prevent default");
    },
  };
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
