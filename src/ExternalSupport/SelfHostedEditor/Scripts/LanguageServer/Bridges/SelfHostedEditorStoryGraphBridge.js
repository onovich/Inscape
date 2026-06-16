import { LanguageServerStoryGraphModelMapper } from "../Models/LanguageServerStoryGraphModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendWorkspaceRequestModel } from "../../Backend/Models/EditorBackendWorkspaceRequestModel.js";

export class SelfHostedEditorStoryGraphBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.storyGraphClient = options.storyGraphClient
      || services?.storyGraphClient
      || createEditorBackendServices(options).storyGraphClient;
    this.workspaceContextProvider = null;
    this.workspaceSnapshotProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  setWorkspaceSnapshotProvider(provider) {
    this.workspaceSnapshotProvider = provider;
  }

  async getStoryGraph(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const request = EditorBackendWorkspaceRequestModel.build({
        scriptText,
        workspace,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      });
      const payload = await this.storyGraphClient.compileProjectGraph(request);

      return {
        graph: LanguageServerStoryGraphModelMapper.mapProjectGraph(
          payload,
          request.activeRelativePath || request.workspace?.currentFilePath || ""
        ),
        provider: "compiler-project",
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        graph: null,
        provider: "unavailable",
      };
    }
  }
}
