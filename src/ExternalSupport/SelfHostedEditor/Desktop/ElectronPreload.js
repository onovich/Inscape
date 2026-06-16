import { contextBridge } from "electron";

export const SelfHostedEditorPreloadApiName = "inscapeSelfHostedEditor";

export const SelfHostedEditorPreloadCapabilities = Object.freeze({
  embeddedBackend: false,
  shell: "electron",
  workspaceFileSystem: false,
});

export function exposeSelfHostedEditorPreloadApi(bridge = contextBridge) {
  bridge.exposeInMainWorld(SelfHostedEditorPreloadApiName, Object.freeze({
    capabilities: SelfHostedEditorPreloadCapabilities,
  }));
}

exposeSelfHostedEditorPreloadApi();
