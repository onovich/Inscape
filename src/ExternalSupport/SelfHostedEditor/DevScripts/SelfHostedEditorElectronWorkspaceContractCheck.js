import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  dispatchSelfHostedEditorBackendCommand,
} from "../Desktop/ElectronBackendCommandDispatcher.js";
import {
  createSelfHostedEditorElectronWorkspaceSessionStore,
  SelfHostedEditorElectronWorkspaceOpenResultFormat,
  SelfHostedEditorElectronWorkspaceReadResultFormat,
} from "../Desktop/ElectronWorkspaceSessionStore.js";
import {
  EditorBackendTransportCommand,
  resolveEditorBackendDevHostRoute,
} from "../Scripts/Backend/Clients/EditorBackendTransport.js";
import {
  EditorBackendProjectSessionFormat,
} from "../Scripts/Backend/Models/EditorBackendProjectSessionModel.js";
import {
  EditorBackendWorkspaceFolderFormat,
} from "../Scripts/Backend/Models/EditorBackendWorkspaceFolderModel.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-workspace-"));

try {
  await writeText(path.join(tempRoot, "story", "opening.inscape"), "# Opening\nNarrator: secret opening text");
  await writeText(path.join(tempRoot, "story", "branch.inscape"), "# Branch\nNarrator: secret branch text");
  await writeText(path.join(tempRoot, "notes", "readme.txt"), "secret notes text");
  await writeText(path.join(tempRoot, ".inscape-workspace", "recovery", "stale.inscape"), "secret recovery text");

  let desktopOnlyRouteRejected = false;
  try {
    resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceOpenFolder);
  } catch (error) {
    desktopOnlyRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
  }
  assertEqual(desktopOnlyRouteRejected, true, "workspace open is desktop-only, not a dev-host route");

  const sessionStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectWorkspaceRoot: async () => tempRoot,
    sessionId: "electron-workspace-session",
  });
  const openResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {
      dialogTitle: "Open smoke workspace",
    },
    {
      sessionStore,
    }
  );
  assertEqual(openResult.format, SelfHostedEditorElectronWorkspaceOpenResultFormat, "workspace open result format");
  assertEqual(openResult.ok, true, "workspace open result ok");
  assertEqual(openResult.workspace.format, EditorBackendWorkspaceFolderFormat, "workspace folder format");
  assertEqual(openResult.workspace.documentCount, 2, "workspace open lists .inscape documents only");
  assertEqual(openResult.workspace.documents.some((document) => document.relativePath === "story/opening.inscape"), true, "workspace open includes opening document");
  assertEqual(openResult.workspace.documents.some((document) => document.relativePath === "story/branch.inscape"), true, "workspace open includes branch document");
  assertEqual(JSON.stringify(openResult).includes("secret"), false, "workspace open result is text-free");
  assertEqual(JSON.stringify(openResult).includes("readme.txt"), false, "workspace open rejects non-inscape files");
  assertEqual(JSON.stringify(openResult).includes(".inscape-workspace/recovery"), false, "workspace open ignores internal workspace files");

  const status = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(status.format, EditorBackendProjectSessionFormat, "workspace status format");
  assertEqual(status.mode, "embedded-desktop", "workspace status mode");
  assertEqual(status.sessionId, "electron-workspace-session", "workspace status session id");
  assertEqual(status.workspace.documentCount, 2, "workspace status document count");
  assertEqual(status.workspace.hasUnsavedChanges, false, "workspace status starts clean");
  assertEqual(JSON.stringify(status).includes("secret"), false, "workspace status is text-free");

  const fileList = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceListFiles,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(fileList.documentCount, 2, "workspace list file count");
  assertEqual(JSON.stringify(fileList).includes("secret"), false, "workspace list is text-free");

  const bufferList = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferList,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(bufferList.documentCount, 2, "document buffer list count");
  assertEqual(bufferList.payloadContentExposed, false, "document buffer list payload flag");
  assertEqual(JSON.stringify(bufferList).includes("secret"), false, "document buffer list is text-free");

  const readResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(readResult.format, SelfHostedEditorElectronWorkspaceReadResultFormat, "document read result format");
  assertEqual(readResult.ok, true, "document read ok");
  assertEqual(readResult.document.text, "# Opening\nNarrator: secret opening text", "document read returns buffer text");
  assertEqual(readResult.pathBoundary.allowed, true, "document read path boundary allowed");

  const rejectedRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "../escape.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(rejectedRead.ok, false, "document read rejects traversal");
  assertEqual(rejectedRead.reason, "path-traversal-rejected", "document read traversal reason");
  assertEqual(JSON.stringify(rejectedRead).includes("secret"), false, "rejected document read is text-free");

  const updateResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: readResult.document.revision,
      relativePath: "story/opening.inscape",
      text: "# Opening\nNarrator: secret updated text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(updateResult.ok, true, "document update draft ok");
  assertEqual(updateResult.document.dirty, true, "document update draft summary dirty");
  assertEqual(updateResult.payloadContentExposed, false, "document update draft response is text-free");
  assertEqual(JSON.stringify(updateResult).includes("secret updated text"), false, "document update draft does not echo text");

  const dirtyStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(dirtyStatus.workspace.hasUnsavedChanges, true, "workspace status tracks dirty buffer");
  assertEqual(JSON.stringify(dirtyStatus).includes("secret updated text"), false, "dirty status is text-free");

  const saveResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferSave,
    {
      baseRevision: updateResult.document.revision,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(saveResult.ok, true, "document save ok");
  assertEqual(saveResult.saveStatus.state, "saved", "document save status");
  assertEqual(saveResult.document.dirty, false, "document save summary clean");
  assertEqual(JSON.stringify(saveResult).includes("secret updated text"), false, "document save response is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret updated text",
    "document save writes disk"
  );

  const cleanStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(cleanStatus.workspace.hasUnsavedChanges, false, "workspace status clean after save");

  const branchRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/branch.inscape",
    },
    {
      sessionStore,
    }
  );
  const branchUpdate = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: branchRead.document.revision,
      relativePath: "story/branch.inscape",
      text: "# Branch\nNarrator: secret branch updated text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(branchUpdate.ok, true, "branch update ok");
  const saveAllResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferSaveAll,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(saveAllResult.ok, true, "document save all ok");
  assertEqual(saveAllResult.savedCount, 1, "document save all saves dirty branch");
  assertEqual(JSON.stringify(saveAllResult).includes("secret branch updated text"), false, "save all response is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "branch.inscape"), "utf8"),
    "# Branch\nNarrator: secret branch updated text",
    "document save all writes disk"
  );

  const conflictRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  const conflictUpdate = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: conflictRead.document.revision,
      relativePath: "story/opening.inscape",
      text: "# Opening\nNarrator: secret conflicting draft",
    },
    {
      sessionStore,
    }
  );
  assertEqual(conflictUpdate.ok, true, "conflict draft update ok");
  const staleSave = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferSave,
    {
      baseRevision: conflictRead.document.revision,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(staleSave.ok, false, "document save rejects stale revision");
  assertEqual(staleSave.reason, "stale-document-revision", "document save stale reason");
  assertEqual(JSON.stringify(staleSave).includes("secret conflicting draft"), false, "stale save response is text-free");
  await fs.writeFile(path.join(tempRoot, "story", "opening.inscape"), "# Opening\nNarrator: external disk change", "utf8");
  const conflictSave = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferSave,
    {
      baseRevision: conflictUpdate.document.revision,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  assertEqual(conflictSave.ok, false, "document save rejects disk conflict");
  assertEqual(conflictSave.reason, "disk-conflict", "document save disk conflict reason");
  assertEqual(JSON.stringify(conflictSave).includes("secret conflicting draft"), false, "disk conflict response is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: external disk change",
    "disk conflict does not overwrite external change"
  );

  const canceledStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectWorkspaceRoot: async () => "",
  });
  const canceledOpen = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore: canceledStore,
    }
  );
  assertEqual(canceledOpen.ok, false, "workspace open canceled rejected");
  assertEqual(canceledOpen.reason, "workspace-open-canceled", "workspace open canceled reason");

  const fileStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectWorkspaceRoot: async () => path.join(tempRoot, "story", "opening.inscape"),
  });
  const fileOpen = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore: fileStore,
    }
  );
  assertEqual(fileOpen.ok, false, "single file open rejected");
  assertEqual(fileOpen.reason, "single-file-mode-rejected", "single file rejection reason");

  console.log("SelfHostedEditor Electron workspace contract ok");
} finally {
  await fs.rm(tempRoot, { force: true, recursive: true });
}

async function writeText(filePath, text) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, text, "utf8");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}
