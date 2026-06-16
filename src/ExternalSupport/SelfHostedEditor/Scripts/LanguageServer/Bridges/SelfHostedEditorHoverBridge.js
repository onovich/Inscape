import { LanguageServerHoverModelMapper } from "../Models/LanguageServerHoverModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";

export class SelfHostedEditorHoverBridge {
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

  async getHover(scriptText, hoverTarget) {
    try {
      const payload = await this.languageSessionClient.hover(LanguageServerAuthoringRequestModel.build({
        query: {
          hoverKind: hoverTarget.kind,
          hoverName: hoverTarget.name,
        },
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));

      return LanguageServerHoverModelMapper.mapHover(payload);
    } catch (error) {
      console.warn("SelfHostedEditor hover fallback:", error);
      return null;
    }
  }
}
