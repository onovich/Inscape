import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  dispatchSelfHostedEditorBackendCommand,
} from "../Desktop/ElectronBackendCommandDispatcher.js";
import {
  createSelfHostedEditorElectronWorkspaceSessionStore,
  SelfHostedEditorElectronAssetImportResultFormat,
  SelfHostedEditorElectronAutosaveResultFormat,
  SelfHostedEditorElectronFlushResultFormat,
  SelfHostedEditorElectronRecoveryActionResultFormat,
  SelfHostedEditorElectronWriteBackBackupResultFormat,
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
const assetSourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "inscape-electron-asset-sources-"));

try {
  await writeText(path.join(tempRoot, "story", "opening.inscape"), "# Opening\nNarrator: secret opening text");
  await writeText(path.join(tempRoot, "story", "branch.inscape"), "# Branch\nNarrator: secret branch text");
  await writeText(path.join(tempRoot, "localization", "zh-cn.csv"), "anchor,text\nsecret-anchor,old translation");
  await writeText(path.join(tempRoot, "inscape.node-map.json"), "{\n  \"secretNode\": true\n}");
  await writeText(path.join(tempRoot, "metadata", "inscape.line-map.json"), "{\n  \"secretLine\": true\n}");
  await writeText(path.join(tempRoot, "assets", "images", "court-portrait.png"), "existing asset bytes");
  await writeText(path.join(tempRoot, "notes", "readme.txt"), "secret notes text");
  await writeText(path.join(tempRoot, ".inscape-workspace", "recovery", "stale.inscape"), "secret recovery text");
  const assetImageSourcePath = path.join(assetSourceRoot, "court portrait.png");
  const assetAudioSourcePath = path.join(assetSourceRoot, "theme song.wav");
  const assetCsvSourcePath = path.join(assetSourceRoot, "dialogue rows.csv");
  const assetUnsupportedSourcePath = path.join(assetSourceRoot, "author notes.txt");
  await writeText(assetImageSourcePath, "secret imported image bytes");
  await writeText(assetAudioSourcePath, "secret imported audio bytes");
  await writeText(assetCsvSourcePath, "secret imported,csv bytes");
  await writeText(assetUnsupportedSourcePath, "secret unsupported asset bytes");
  const oldBackupPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "backups",
    "localization",
    "zh-cn.csv.20260610T000000000Z.bak"
  );
  await writeText(oldBackupPath, "secret old backup text");
  const oldBackupDate = new Date("2026-06-10T00:00:00.000Z");
  await fs.utimes(oldBackupPath, oldBackupDate, oldBackupDate);

  let desktopOnlyRouteRejected = false;
  try {
    resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceOpenFolder);
  } catch (error) {
    desktopOnlyRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
  }
  assertEqual(desktopOnlyRouteRejected, true, "workspace open is desktop-only, not a dev-host route");
  let backupRouteRejected = false;
  try {
    resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceWriteBackBackup);
  } catch (error) {
    backupRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
  }
  assertEqual(backupRouteRejected, true, "write-back backup is desktop-only, not a dev-host route");
  let assetImportRouteRejected = false;
  try {
    resolveEditorBackendDevHostRoute(EditorBackendTransportCommand.WorkspaceImportAssets);
  } catch (error) {
    assetImportRouteRejected = String(error?.message || "").includes("does not have a dev-host HTTP route");
  }
  assertEqual(assetImportRouteRejected, true, "asset import is desktop-only, not a dev-host route");

  const languageSessionCalls = [];
  const sessionStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    languageSessionHandlers: {
      async completions(payload = {}) {
        languageSessionCalls.push({ kind: "completions", payload });
        return { completions: [{ label: "CurrentBufferTarget" }] };
      },
      async diagnostics(payload = {}) {
        languageSessionCalls.push({ kind: "diagnostics", payload });
        return { diagnostics: [] };
      },
    },
    selectAssetImportSources: async () => [
      assetImageSourcePath,
      assetAudioSourcePath,
      assetCsvSourcePath,
      assetUnsupportedSourcePath,
    ],
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

  const writeBackBackupResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceWriteBackBackup,
    {
      nowUtc: "2026-06-17T01:02:03.000Z",
      retentionDays: 1,
      retentionLimit: 0,
      writeRequests: [
        { relativePath: "localization/zh-cn.csv" },
        { relativePath: "inscape.node-map.json" },
        { relativePath: "metadata/inscape.line-map.json" },
        { relativePath: "story/opening.inscape" },
      ],
    },
    {
      sessionStore,
    }
  );
  assertEqual(writeBackBackupResult.format, SelfHostedEditorElectronWriteBackBackupResultFormat, "write-back backup result format");
  assertEqual(writeBackBackupResult.ok, true, "write-back backup ok");
  assertEqual(writeBackBackupResult.copiedCount, 3, "write-back backup copies supported sidecars");
  assertEqual(writeBackBackupResult.cleanupCount, 1, "write-back backup cleans old retained backup");
  assertEqual(writeBackBackupResult.skippedWrites[0].reason, "backup-target-not-supported", "write-back backup skips inscape document");
  assertEqual(JSON.stringify(writeBackBackupResult).includes("secret"), false, "write-back backup result is text-free");
  const localizationBackupPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "backups",
    "localization",
    "zh-cn.csv.20260617T010203000Z.bak"
  );
  const nodeMapBackupPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "backups",
    "inscape.node-map.json.20260617T010203000Z.bak"
  );
  const lineMapBackupPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "backups",
    "metadata",
    "inscape.line-map.json.20260617T010203000Z.bak"
  );
  assertEqual(await fileExists(localizationBackupPath), true, "write-back backup copies localization CSV");
  assertEqual(await fileExists(nodeMapBackupPath), true, "write-back backup copies node-map sidecar");
  assertEqual(await fileExists(lineMapBackupPath), true, "write-back backup copies line-map sidecar");
  assertEqual(await fileExists(oldBackupPath), false, "write-back backup removes retention cleanup candidate");
  assertEqual(
    await fs.readFile(localizationBackupPath, "utf8"),
    "anchor,text\nsecret-anchor,old translation",
    "write-back backup preserves localization CSV bytes"
  );

  const assetImportResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceImportAssets,
    {
      dialogTitle: "Import smoke assets",
    },
    {
      sessionStore,
    }
  );
  assertEqual(assetImportResult.format, SelfHostedEditorElectronAssetImportResultFormat, "asset import result format");
  assertEqual(assetImportResult.ok, true, "asset import ok");
  assertEqual(assetImportResult.copiedCount, 3, "asset import copies supported files");
  assertEqual(assetImportResult.skippedImports[0].reason, "asset-extension-not-supported", "asset import skips unsupported extension");
  assertEqual(JSON.stringify(assetImportResult).includes("secret"), false, "asset import result is content-free");
  assertEqual(JSON.stringify(assetImportResult).includes(assetSourceRoot.replace(/\\/g, "/")), false, "asset import result does not persist source root");
  const importedImagePath = path.join(tempRoot, "assets", "images", "court-portrait-1.png");
  const importedAudioPath = path.join(tempRoot, "assets", "audio", "theme-song.wav");
  const importedCsvPath = path.join(tempRoot, "assets", "data", "dialogue-rows.csv");
  const unsupportedAssetTargetPath = path.join(tempRoot, "assets", "data", "author-notes.txt");
  assertEqual(await fileExists(importedImagePath), true, "asset import copies image with collision suffix");
  assertEqual(await fileExists(importedAudioPath), true, "asset import copies audio");
  assertEqual(await fileExists(importedCsvPath), true, "asset import copies CSV data");
  assertEqual(await fileExists(unsupportedAssetTargetPath), false, "asset import does not copy unsupported txt");
  assertEqual(await fs.readFile(importedImagePath, "utf8"), "secret imported image bytes", "asset import preserves image bytes");
  assertEqual(await fs.readFile(importedAudioPath, "utf8"), "secret imported audio bytes", "asset import preserves audio bytes");
  assertEqual(await fs.readFile(importedCsvPath, "utf8"), "secret imported,csv bytes", "asset import preserves CSV bytes");

  const missingAssetStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectAssetImportSources: async () => [
      path.join(assetSourceRoot, "missing portrait.png"),
    ],
    selectWorkspaceRoot: async () => tempRoot,
    sessionId: "electron-workspace-missing-asset",
  });
  await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore: missingAssetStore,
    }
  );
  const missingAssetResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceImportAssets,
    {},
    {
      sessionStore: missingAssetStore,
    }
  );
  assertEqual(missingAssetResult.ok, false, "asset import reports missing source failure");
  assertEqual(missingAssetResult.copyResults[0].reason, "asset-source-not-found", "asset import missing source reason");
  assertEqual(await fileExists(path.join(tempRoot, "assets", "images", "missing-portrait.png")), false, "asset import failure leaves no target file");

  const disabledWriteBackBackupResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceWriteBackBackup,
    {
      backupEnabled: false,
      writeRequests: [
        { relativePath: "localization/zh-cn.csv" },
      ],
    },
    {
      sessionStore,
    }
  );
  assertEqual(disabledWriteBackBackupResult.ok, true, "disabled write-back backup remains non-blocking");
  assertEqual(disabledWriteBackBackupResult.copiedCount, 0, "disabled write-back backup copies nothing");
  assertEqual(disabledWriteBackBackupResult.skippedWrites[0].reason, "backup-disabled", "disabled write-back backup reason");

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
  assertEqual(updateResult.recoveryWrite.ok, true, "document update writes recovery snapshot");
  const openingSnapshotPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "recovery",
    "story",
    "opening.inscape.snapshot.json"
  );
  assertEqual(await fileExists(openingSnapshotPath), true, "recovery snapshot file exists after dirty edit");
  assertEqual(
    (await fs.readFile(openingSnapshotPath, "utf8")).includes("secret updated text"),
    true,
    "recovery snapshot file stores recoverable text"
  );
  const diagnosticsResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageDiagnostics,
    {
      activeRelativePath: "story/opening.inscape",
      scriptText: "# Stale\nNarrator: stale renderer text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(Array.isArray(diagnosticsResult.diagnostics), true, "language diagnostics command returns handler result");
  const completionsResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.LanguageCompletions,
    {
      activeRelativePath: "story/opening.inscape",
      scriptText: "# Stale\nNarrator: stale renderer completion text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(completionsResult.completions[0].label, "CurrentBufferTarget", "language completions command returns handler result");
  assertEqual(languageSessionCalls.length, 2, "workspace language session call count");
  for (const call of languageSessionCalls) {
    const activePayloadDocument = call.payload.workspace.documents.find((document) => document.relativePath === call.payload.activeRelativePath);
    assertEqual(call.payload.activeRelativePath, "story/opening.inscape", `workspace ${call.kind} active path`);
    assertEqual(call.payload.languageSession.format, "inscape.self-hosted-editor.language-session-request", `workspace ${call.kind} shared language envelope`);
    assertEqual(call.payload.languageSession.query.kind, call.kind, `workspace ${call.kind} shared language query kind`);
    assertEqual(call.payload.scriptText, "# Opening\nNarrator: secret updated text", `workspace ${call.kind} uses current buffer`);
    assertEqual(activePayloadDocument.text, "# Opening\nNarrator: secret updated text", `workspace ${call.kind} snapshot includes current buffer`);
    assertEqual(JSON.stringify(call.payload).includes("stale renderer"), false, `workspace ${call.kind} ignores stale renderer text`);
  }

  const dirtyStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(dirtyStatus.workspace.hasUnsavedChanges, true, "workspace status tracks dirty buffer");
  assertEqual(dirtyStatus.recoveryStatus.state, "available", "workspace status reports recovery availability");
  assertEqual(
    dirtyStatus.recoveryStatus.items.some((item) => item.relativePath === "story/opening.inscape"),
    true,
    "workspace status lists recovery item"
  );
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
  assertEqual(saveResult.recoveryCleanup.ok, true, "document save cleans recovery snapshot");
  assertEqual(await fileExists(openingSnapshotPath), false, "document save removes recovery snapshot");
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
  assertEqual(cleanStatus.recoveryStatus.state, "none", "workspace status recovery clears after save");

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
  const branchSnapshotPath = path.join(
    tempRoot,
    ".inscape-workspace",
    "recovery",
    "story",
    "branch.inscape.snapshot.json"
  );
  assertEqual(await fileExists(branchSnapshotPath), true, "branch update writes recovery snapshot");
  const saveAllResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferSaveAll,
    {},
    {
      sessionStore,
    }
  );
  assertEqual(saveAllResult.ok, true, "document save all ok");
  assertEqual(saveAllResult.savedCount, 1, "document save all saves dirty branch");
  assertEqual(await fileExists(branchSnapshotPath), false, "save all removes branch recovery snapshot");
  assertEqual(JSON.stringify(saveAllResult).includes("secret branch updated text"), false, "save all response is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "branch.inscape"), "utf8"),
    "# Branch\nNarrator: secret branch updated text",
    "document save all writes disk"
  );

  const autosaveRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/branch.inscape",
    },
    {
      sessionStore,
    }
  );
  const autosaveUpdate = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: autosaveRead.document.revision,
      relativePath: "story/branch.inscape",
      text: "# Branch\nNarrator: secret branch autosave text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(autosaveUpdate.ok, true, "autosave draft update ok");
  assertEqual(await fileExists(branchSnapshotPath), true, "autosave draft writes recovery snapshot");
  const waitingAutosave = await sessionStore.runAutosave({
    debounceMs: 1000,
    idleElapsedMs: 250,
  });
  assertEqual(waitingAutosave.format, SelfHostedEditorElectronAutosaveResultFormat, "waiting autosave result format");
  assertEqual(waitingAutosave.autosavePlan.ready, false, "waiting autosave not ready");
  assertEqual(waitingAutosave.savedCount, 0, "waiting autosave does not save");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "branch.inscape"), "utf8"),
    "# Branch\nNarrator: secret branch updated text",
    "waiting autosave does not write disk"
  );
  assertEqual(await fileExists(branchSnapshotPath), true, "waiting autosave keeps recovery snapshot");
  const autosaveResult = await sessionStore.runAutosave({
    debounceMs: 1000,
    idleElapsedMs: 1000,
  });
  assertEqual(autosaveResult.ok, true, "ready autosave ok");
  assertEqual(autosaveResult.savedCount, 1, "ready autosave saves latest dirty document");
  assertEqual(autosaveResult.autosavePlan.ready, true, "ready autosave plan ready");
  assertEqual(JSON.stringify(autosaveResult).includes("secret branch autosave text"), false, "autosave result is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "branch.inscape"), "utf8"),
    "# Branch\nNarrator: secret branch autosave text",
    "ready autosave writes disk"
  );
  assertEqual(await fileExists(branchSnapshotPath), false, "ready autosave cleans recovery snapshot");

  const flushRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore,
    }
  );
  const flushUpdate = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: flushRead.document.revision,
      relativePath: "story/opening.inscape",
      text: "# Opening\nNarrator: secret app exit flush text",
    },
    {
      sessionStore,
    }
  );
  assertEqual(flushUpdate.ok, true, "flush draft update ok");
  assertEqual(await fileExists(openingSnapshotPath), true, "flush draft writes recovery snapshot");
  const flushResult = await sessionStore.flushDirtyDocuments({
    trigger: "app-exit",
  });
  assertEqual(flushResult.format, SelfHostedEditorElectronFlushResultFormat, "flush result format");
  assertEqual(flushResult.ok, true, "app-exit flush ok");
  assertEqual(flushResult.trigger, "app-exit", "flush result trigger");
  assertEqual(flushResult.flushPlan.flushRequestCount, 1, "flush schedules dirty document");
  assertEqual(flushResult.finalPlan.continuationBlocked, false, "flush final plan allows continuation");
  assertEqual(flushResult.savedCount, 1, "flush saves dirty document");
  assertEqual(JSON.stringify(flushResult).includes("secret app exit flush text"), false, "flush result is text-free");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret app exit flush text",
    "app-exit flush writes disk"
  );
  assertEqual(await fileExists(openingSnapshotPath), false, "app-exit flush cleans recovery snapshot");

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
  assertEqual(await fileExists(openingSnapshotPath), true, "conflict draft keeps recovery snapshot");
  assertEqual(
    (await fs.readFile(openingSnapshotPath, "utf8")).includes("secret conflicting draft"),
    true,
    "conflict recovery snapshot stores latest draft text"
  );
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
  await writeText(
    path.join(tempRoot, ".inscape-workspace", "recovery", "tampered.snapshot.json"),
    JSON.stringify({
      contentHash: "fnv1a32:00000000",
      documentRevision: 2,
      relativePath: "../escape.inscape",
      snapshotModifiedUtc: new Date().toISOString(),
    })
  );

  const reopenedStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectWorkspaceRoot: async () => tempRoot,
    sessionId: "electron-workspace-reopen-session",
  });
  const reopened = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore: reopenedStore,
    }
  );
  assertEqual(reopened.ok, true, "workspace reopen ok");
  assertEqual(reopened.projectSession.recoveryStatus.state, "available", "workspace reopen scans recovery snapshot");
  assertEqual(
    reopened.projectSession.recoveryStatus.items.some((item) => item.relativePath === "story/opening.inscape"),
    true,
    "workspace reopen reports valid recovery snapshot"
  );
  assertEqual(
    reopened.projectSession.recoveryStatus.items.some((item) => item.relativePath === "../escape.inscape"),
    false,
    "workspace reopen skips tampered recovery snapshot path"
  );
  assertEqual(JSON.stringify(reopened.projectSession).includes("secret conflicting draft"), false, "reopened recovery status is text-free");
  const recoveryItem = reopened.projectSession.recoveryStatus.items.find((item) => item.relativePath === "story/opening.inscape");
  const restoreResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.RecoveryRestore,
    {
      contentHash: recoveryItem.contentHash,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore: reopenedStore,
    }
  );
  assertEqual(restoreResult.format, SelfHostedEditorElectronRecoveryActionResultFormat, "recovery restore result format");
  assertEqual(restoreResult.ok, true, "recovery restore ok");
  assertEqual(restoreResult.action, "restore", "recovery restore action");
  assertEqual(restoreResult.recoveryCleanup.ok, true, "recovery restore removes snapshot");
  assertEqual(await fileExists(openingSnapshotPath), false, "recovery restore deletes snapshot file");
  assertEqual(
    await fs.readFile(path.join(tempRoot, "story", "opening.inscape"), "utf8"),
    "# Opening\nNarrator: secret conflicting draft",
    "recovery restore writes snapshot text to disk"
  );
  assertEqual(JSON.stringify(restoreResult).includes("secret conflicting draft"), false, "recovery restore response is text-free");

  const laterRead = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferRead,
    {
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore: reopenedStore,
    }
  );
  const laterUpdate = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.DocumentBufferUpdateDraft,
    {
      baseRevision: laterRead.document.revision,
      relativePath: "story/opening.inscape",
      text: "# Opening\nNarrator: secret later recovery text",
    },
    {
      sessionStore: reopenedStore,
    }
  );
  assertEqual(laterUpdate.ok, true, "recovery later setup update ok");
  assertEqual(await fileExists(openingSnapshotPath), true, "recovery later setup writes snapshot");
  const laterStatus = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.ProjectSessionStatus,
    {},
    {
      sessionStore: reopenedStore,
    }
  );
  const laterItem = laterStatus.recoveryStatus.items.find((item) => item.relativePath === "story/opening.inscape");
  const laterResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.RecoveryLater,
    {
      contentHash: laterItem.contentHash,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore: reopenedStore,
    }
  );
  assertEqual(laterResult.ok, true, "recovery later ok");
  assertEqual(laterResult.action, "later", "recovery later action");
  assertEqual(laterResult.recoveryStatus.items[0].actionState, "later", "recovery later marks item in session");
  assertEqual(await fileExists(openingSnapshotPath), true, "recovery later keeps snapshot");
  assertEqual(JSON.stringify(laterResult).includes("secret later recovery text"), false, "recovery later response is text-free");
  const discardResult = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.RecoveryDiscard,
    {
      contentHash: laterItem.contentHash,
      relativePath: "story/opening.inscape",
    },
    {
      sessionStore: reopenedStore,
    }
  );
  assertEqual(discardResult.ok, true, "recovery discard ok");
  assertEqual(discardResult.action, "discard", "recovery discard action");
  assertEqual(await fileExists(openingSnapshotPath), false, "recovery discard deletes snapshot");
  assertEqual(discardResult.recoveryStatus.state, "none", "recovery discard clears status");
  assertEqual(JSON.stringify(discardResult).includes("secret later recovery text"), false, "recovery discard response is text-free");

  const canceledStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectAssetImportSources: async () => [],
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

  const canceledAssetStore = createSelfHostedEditorElectronWorkspaceSessionStore({
    selectAssetImportSources: async () => [],
    selectWorkspaceRoot: async () => tempRoot,
  });
  await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceOpenFolder,
    {},
    {
      sessionStore: canceledAssetStore,
    }
  );
  const canceledAssetImport = await dispatchSelfHostedEditorBackendCommand(
    EditorBackendTransportCommand.WorkspaceImportAssets,
    {},
    {
      sessionStore: canceledAssetStore,
    }
  );
  assertEqual(canceledAssetImport.ok, true, "asset import cancel is non-blocking");
  assertEqual(canceledAssetImport.reason, "asset-import-canceled", "asset import cancel reason");
  assertEqual(canceledAssetImport.copiedCount, 0, "asset import cancel copies nothing");

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
  await fs.rm(assetSourceRoot, { force: true, recursive: true });
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

async function fileExists(filePath) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
