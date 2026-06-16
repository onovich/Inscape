import { LanguageServerReferenceModelMapper } from "../Models/LanguageServerReferenceModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorReferencesBridge {
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

  async getReferences(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.references({
        referenceName: hoverTarget.name,
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

      return LanguageServerReferenceModelMapper.mapReferences(payload);
    } catch (error) {
      console.warn("SelfHostedEditor references fallback:", error);
      return [];
    }
  }
}
