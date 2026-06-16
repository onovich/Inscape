import { LanguageServerCompletionModelMapper } from "../Models/LanguageServerCompletionModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";

export class SelfHostedEditorCompletionBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.languageSessionClient = options.languageSessionClient
      || services?.languageSessionClient
      || createEditorBackendServices(options).languageSessionClient;
    this.workspaceContextProvider = null;
    this.workspaceSnapshotProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  setWorkspaceSnapshotProvider(provider) {
    this.workspaceSnapshotProvider = provider;
  }

  async getCompletions(scriptText) {
    try {
      const payload = await this.languageSessionClient.completions(LanguageServerAuthoringRequestModel.build({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));

      return LanguageServerCompletionModelMapper.mapCompletions(payload);
    } catch (error) {
      console.warn("SelfHostedEditor completions fallback:", error);
      return [];
    }
  }
}
