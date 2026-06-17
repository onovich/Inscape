import { dialog, ipcMain } from "electron";
import {
  createSelfHostedEditorElectronBackendCommandDispatcher,
  dispatchSelfHostedEditorBackendCommand,
} from "./ElectronBackendCommandDispatcher.js";
import {
  SelfHostedEditorElectronIpcChannel,
} from "./ElectronIpcContract.js";

let selfHostedEditorBackendIpcRegistered = false;

export function registerSelfHostedEditorBackendIpc(electronIpcMain = ipcMain, options = {}) {
  if (selfHostedEditorBackendIpcRegistered && !options.allowDuplicate) {
    return false;
  }

  const dispatcher = options.dispatcher || createSelfHostedEditorElectronBackendCommandDispatcher({
    ...options,
    selectAssetImportSources: options.selectAssetImportSources || ((payload) => selectSelfHostedEditorAssetImportSources(payload, options.dialog || dialog)),
    selectWorkspaceRoot: options.selectWorkspaceRoot || ((payload) => selectSelfHostedEditorWorkspaceRoot(payload, options.dialog || dialog)),
  });
  electronIpcMain.handle(SelfHostedEditorElectronIpcChannel, async (_event, envelope = {}) => {
    return await dispatcher(envelope.command, envelope.payload);
  });
  selfHostedEditorBackendIpcRegistered = true;
  return true;
}

export async function selectSelfHostedEditorWorkspaceRoot(payload = {}, electronDialog = dialog) {
  const result = await electronDialog.showOpenDialog({
    properties: ["openDirectory"],
    title: String(payload.dialogTitle || "Open Inscape Workspace"),
  });
  if (result?.canceled) {
    return "";
  }

  return result?.filePaths?.[0] || "";
}

export async function selectSelfHostedEditorAssetImportSources(payload = {}, electronDialog = dialog) {
  const result = await electronDialog.showOpenDialog({
    filters: [
      {
        extensions: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "mp3", "wav", "ogg", "flac", "m4a", "csv"],
        name: "Inscape Resources",
      },
      {
        extensions: ["*"],
        name: "All Files",
      },
    ],
    properties: ["openFile", "multiSelections"],
    title: String(payload.dialogTitle || "Import Inscape Resources"),
  });
  if (result?.canceled) {
    return [];
  }

  return Array.isArray(result?.filePaths) ? result.filePaths : [];
}

export async function dispatchSelfHostedEditorBackendCommandOnce(command, payload = {}, options = {}) {
  return await dispatchSelfHostedEditorBackendCommand(command, payload, options);
}
