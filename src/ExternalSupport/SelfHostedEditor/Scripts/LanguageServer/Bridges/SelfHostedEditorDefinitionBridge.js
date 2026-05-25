import { LanguageServerDefinitionModelMapper } from "../Models/LanguageServerDefinitionModelMapper.js";

export class SelfHostedEditorDefinitionBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDefinition(scriptText, hoverTarget) {
    try {
      const response = await fetch("/api/definition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          definitionName: hoverTarget.name,
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Definition request failed with ${response.status}.`);
      }

      const payload = await response.json();
      return LanguageServerDefinitionModelMapper.mapDefinition(payload);
    } catch (error) {
      console.warn("SelfHostedEditor definition fallback:", error);
      return null;
    }
  }
}
