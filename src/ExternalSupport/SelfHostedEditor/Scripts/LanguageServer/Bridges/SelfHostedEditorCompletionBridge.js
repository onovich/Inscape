import { LanguageServerCompletionModelMapper } from "../Models/LanguageServerCompletionModelMapper.js";

export class SelfHostedEditorCompletionBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getCompletions(scriptText) {
    try {
      const response = await fetch("/api/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Completions request failed with ${response.status}.`);
      }

      const payload = await response.json();
      return LanguageServerCompletionModelMapper.mapCompletions(payload);
    } catch (error) {
      console.warn("SelfHostedEditor completions fallback:", error);
      return [];
    }
  }
}
