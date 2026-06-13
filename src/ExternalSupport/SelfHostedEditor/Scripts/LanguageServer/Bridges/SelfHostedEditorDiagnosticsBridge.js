import { LanguageServerDiagnosticModelMapper } from "../Models/LanguageServerDiagnosticModelMapper.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";
import { ScriptDiagnosticsModelBuilder } from "../../ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";

export class SelfHostedEditorDiagnosticsBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDiagnostics(scriptText) {
    try {
      const payload = await this.backendClient.languageSession.diagnose({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

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
