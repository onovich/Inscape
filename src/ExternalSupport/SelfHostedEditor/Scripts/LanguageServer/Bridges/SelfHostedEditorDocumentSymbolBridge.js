import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";
import { LanguageServerDocumentSymbolModelMapper } from "../Models/LanguageServerDocumentSymbolModelMapper.js";

export class SelfHostedEditorDocumentSymbolBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDocumentSymbols(scriptText) {
    try {
      const payload = await this.backendClient.languageSession.documentSymbols({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
      });

      return {
        provider: "language-server",
        symbols: LanguageServerDocumentSymbolModelMapper.mapSymbols(payload),
      };
    } catch (error) {
      console.warn("SelfHostedEditor document symbols fallback:", error);
      const documentModel = ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
        reason: ScriptDocumentFallbackReason.DocumentSymbolsLanguageServerUnavailable,
      });
      return {
        provider: "draft-fallback",
        symbols: documentModel.nodes.map((node) => ({
          kind: "node",
          name: node.title,
          sourceLine: node.sourceLine,
        })),
      };
    }
  }
}
