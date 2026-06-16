import { ipcMain } from "electron";
import {
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

  electronIpcMain.handle(SelfHostedEditorElectronIpcChannel, async (_event, envelope = {}) => {
    return await dispatchSelfHostedEditorBackendCommand(envelope.command, envelope.payload, options);
  });
  selfHostedEditorBackendIpcRegistered = true;
  return true;
}
