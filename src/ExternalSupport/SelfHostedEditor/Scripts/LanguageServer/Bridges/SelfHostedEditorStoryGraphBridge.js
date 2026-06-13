import { LanguageServerStoryGraphModelMapper } from "../Models/LanguageServerStoryGraphModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorStoryGraphBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getStoryGraph(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const payload = await this.backendClient.storyGraph.compileProjectGraph({
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
