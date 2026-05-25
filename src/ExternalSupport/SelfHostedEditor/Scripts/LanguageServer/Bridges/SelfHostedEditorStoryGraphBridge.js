import { LanguageServerStoryGraphModelMapper } from "../Models/LanguageServerStoryGraphModelMapper.js";

export class SelfHostedEditorStoryGraphBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getStoryGraph(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const response = await fetch("/api/story-graph", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptText,
          workspace,
        }),
      });

      if (!response.ok) {
        throw new Error(`Story graph bridge returned HTTP ${response.status}.`);
      }

      const payload = await response.json();
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
