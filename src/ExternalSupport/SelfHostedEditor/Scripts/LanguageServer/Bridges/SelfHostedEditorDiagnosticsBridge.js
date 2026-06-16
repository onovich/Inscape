import { LanguageServerDiagnosticModelMapper } from "../Models/LanguageServerDiagnosticModelMapper.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";
import { ScriptDiagnosticsModelBuilder } from "../../ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";

export class SelfHostedEditorDiagnosticsBridge {
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

  async getDiagnostics(scriptText) {
    try {
      const payload = await this.languageSessionClient.diagnose(LanguageServerAuthoringRequestModel.build({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));

      return {
        diagnostics: LanguageServerDiagnosticModelMapper.mapDiagnostics(payload),
        provider: "language-server",
      };
    } catch (error) {
      console.warn("SelfHostedEditor diagnostics fallback:", error);
      return {
        diagnostics: ScriptDiagnosticsModelBuilder.build(scriptText),
        provider: "draft-fallback",
      };
    }
  }
}
