import { LanguageServerDefinitionModelMapper } from "../Models/LanguageServerDefinitionModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorDefinitionBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDefinition(scriptText, hoverTarget) {
    try {
      const payload = await this.backendClient.languageSession.definition({
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
