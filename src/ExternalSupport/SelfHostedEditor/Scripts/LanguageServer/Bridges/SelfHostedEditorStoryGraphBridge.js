import { LanguageServerStoryGraphModelMapper } from "../Models/LanguageServerStoryGraphModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorStoryGraphBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.storyGraphClient = options.storyGraphClient
      || services?.storyGraphClient
      || createEditorBackendServices(options).storyGraphClient;
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getStoryGraph(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const payload = await this.storyGraphClient.compileProjectGraph({
        scriptText,
        workspace,
      });

      return {
        graph: LanguageServerStoryGraphModelMapper.mapProjectGraph(payload, workspace?.currentFilePath || ""),
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
