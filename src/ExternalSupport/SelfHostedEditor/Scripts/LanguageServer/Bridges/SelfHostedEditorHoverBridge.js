import { LanguageServerHoverModelMapper } from "../Models/LanguageServerHoverModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorHoverBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getHover(scriptText, hoverTarget) {
    try {
      const payload = await this.backendClient.languageSession.hover({
        hoverKind: hoverTarget.kind,
        hoverName: hoverTarget.name,
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

      return LanguageServerHoverModelMapper.mapHover(payload);
    } catch (error) {
      console.warn("SelfHostedEditor hover fallback:", error);
      return null;
    }
  }
}
