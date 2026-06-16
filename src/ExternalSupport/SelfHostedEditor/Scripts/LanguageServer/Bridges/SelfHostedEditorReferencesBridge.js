import { LanguageServerReferenceModelMapper } from "../Models/LanguageServerReferenceModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";

export class SelfHostedEditorReferencesBridge {
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

  async getReferences(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.references(LanguageServerAuthoringRequestModel.build({
        query: {
          referenceName: hoverTarget.name,
        },
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));

      return LanguageServerReferenceModelMapper.mapReferences(payload);
    } catch (error) {
      console.warn("SelfHostedEditor references fallback:", error);
      return [];
    }
  }
}
