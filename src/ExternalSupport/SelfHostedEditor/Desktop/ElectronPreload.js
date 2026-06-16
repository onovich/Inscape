import { contextBridge, ipcRenderer } from "electron";
import {
  createSelfHostedEditorPreloadApi,
  listSelfHostedEditorPreloadCommands,
  SelfHostedEditorPreloadApiName,
} from "./ElectronPreloadApi.js";
import {
  buildSelfHostedEditorElectronIpcEnvelope,
  SelfHostedEditorElectronIpcChannel,
} from "./ElectronIpcContract.js";

export function createSelfHostedEditorPreloadIpcHandlers(electronIpcRenderer = ipcRenderer) {
  return Object.fromEntries(listSelfHostedEditorPreloadCommands().map((command) => [
    command,
    async (payload = {}) => await electronIpcRenderer.invoke(
      SelfHostedEditorElectronIpcChannel,
      buildSelfHostedEditorElectronIpcEnvelope(command, payload)
    ),
  ]));
}

export function exposeSelfHostedEditorPreloadApi(bridge = contextBridge, electronIpcRenderer = ipcRenderer) {
  bridge.exposeInMainWorld(SelfHostedEditorPreloadApiName, createSelfHostedEditorPreloadApi({
    handlers: createSelfHostedEditorPreloadIpcHandlers(electronIpcRenderer),
  }));
}

exposeSelfHostedEditorPreloadApi();
