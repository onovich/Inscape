import { contextBridge } from "electron";
import {
  createSelfHostedEditorPreloadApi,
  SelfHostedEditorPreloadApiName,
} from "./ElectronPreloadApi.js";

export function exposeSelfHostedEditorPreloadApi(bridge = contextBridge) {
  bridge.exposeInMainWorld(SelfHostedEditorPreloadApiName, createSelfHostedEditorPreloadApi());
}

exposeSelfHostedEditorPreloadApi();
