import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { LanguageServerAuthoringRequestModel } from "../Models/LanguageServerAuthoringRequestModel.js";
import { LanguageServerDocumentSymbolModelMapper } from "../Models/LanguageServerDocumentSymbolModelMapper.js";

export class SelfHostedEditorDocumentSymbolBridge {
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

  async getDocumentSymbols(scriptText) {
    let payload;
    try {
      payload = await this.languageSessionClient.documentSymbols(LanguageServerAuthoringRequestModel.build({
        scriptText,
        workspace: this.workspaceContextProvider?.() || null,
        workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
      }));
    } catch (error) {
      console.warn("SelfHostedEditor document symbols fallback:", error);
      return this.buildDraftFallback(scriptText);
    }

    try {
      return {
        provider: "language-server",
        symbols: LanguageServerDocumentSymbolModelMapper.mapSymbols(payload),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        provider: "language-server-error",
        symbols: [],
      };
    }
  }

  buildDraftFallback(scriptText) {
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
