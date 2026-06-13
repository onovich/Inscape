import { LanguageServerReferenceModelMapper } from "../Models/LanguageServerReferenceModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorReferencesBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getReferences(scriptText, hoverTarget) {
    try {
      const payload = await this.backendClient.languageSession.references({
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
