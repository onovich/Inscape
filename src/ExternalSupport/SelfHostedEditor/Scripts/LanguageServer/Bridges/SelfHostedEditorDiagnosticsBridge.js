import { LanguageServerDiagnosticModelMapper } from "../Models/LanguageServerDiagnosticModelMapper.js";
import { ScriptDiagnosticsModelBuilder } from "../../ProjectWorkspace/Models/ScriptDiagnosticsModelBuilder.js";

export class SelfHostedEditorDiagnosticsBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDiagnostics(scriptText) {
    try {
      const response = await fetch("/api/diagnostics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diagnostics request failed with ${response.status}.`);
      }

      const payload = await response.json();
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
