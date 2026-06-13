import { LanguageServerCompletionModelMapper } from "../Models/LanguageServerCompletionModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorCompletionBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getCompletions(scriptText) {
    try {
      const payload = await this.backendClient.languageSession.completions({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

      return LanguageServerCompletionModelMapper.mapCompletions(payload);
    } catch (error) {
      console.warn("SelfHostedEditor completions fallback:", error);
      return [];
    }
  }
}
