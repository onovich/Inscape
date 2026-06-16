import { LanguageServerCompletionModelMapper } from "../Models/LanguageServerCompletionModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorCompletionBridge {
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

  async getCompletions(scriptText) {
    try {
      const payload = await this.languageSessionClient.completions({
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
