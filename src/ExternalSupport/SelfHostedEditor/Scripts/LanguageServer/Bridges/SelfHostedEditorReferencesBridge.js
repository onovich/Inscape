import { LanguageServerReferenceModelMapper } from "../Models/LanguageServerReferenceModelMapper.js";

export class SelfHostedEditorReferencesBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getReferences(scriptText, hoverTarget) {
    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referenceName: hoverTarget.name,
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`References request failed with ${response.status}.`);
      }

      const payload = await response.json();
      return LanguageServerReferenceModelMapper.mapReferences(payload);
    } catch (error) {
      console.warn("SelfHostedEditor references fallback:", error);
      return [];
    }
  }
}
