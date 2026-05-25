import { LanguageServerHoverModelMapper } from "../Models/LanguageServerHoverModelMapper.js";

export class SelfHostedEditorHoverBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getHover(scriptText, hoverTarget) {
    try {
      const response = await fetch("/api/hover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hoverKind: hoverTarget.kind,
          hoverName: hoverTarget.name,
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Hover request failed with ${response.status}.`);
      }

      const payload = await response.json();
      return LanguageServerHoverModelMapper.mapHover(payload);
    } catch (error) {
      console.warn("SelfHostedEditor hover fallback:", error);
      return null;
    }
  }
}
