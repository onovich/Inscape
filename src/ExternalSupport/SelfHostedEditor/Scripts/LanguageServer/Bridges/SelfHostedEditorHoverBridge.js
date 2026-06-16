import { LanguageServerHoverModelMapper } from "../Models/LanguageServerHoverModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorHoverBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.languageSessionClient = options.languageSessionClient
      || services?.languageSessionClient
      || createEditorBackendServices(options).languageSessionClient;
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getHover(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.hover({
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
