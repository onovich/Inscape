import { LanguageServerDefinitionModelMapper } from "../Models/LanguageServerDefinitionModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";

export class SelfHostedEditorDefinitionBridge {
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

  async getDefinition(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.definition(LanguageServerAuthoringRequestModel.build({
        query: {
          definitionName: hoverTarget.name,
        },
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));

      return LanguageServerDefinitionModelMapper.mapDefinition(payload);
    } catch (error) {
      console.warn("SelfHostedEditor definition fallback:", error);
      return null;
    }
  }
}
