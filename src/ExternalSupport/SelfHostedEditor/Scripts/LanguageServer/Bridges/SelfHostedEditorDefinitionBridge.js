import { LanguageServerDefinitionModelMapper } from "../Models/LanguageServerDefinitionModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorDefinitionBridge {
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

  async getDefinition(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.definition({
        definitionName: hoverTarget.name,
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

      return LanguageServerDefinitionModelMapper.mapDefinition(payload);
    } catch (error) {
      console.warn("SelfHostedEditor definition fallback:", error);
      return null;
    }
  }
}
