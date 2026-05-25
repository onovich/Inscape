import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { LanguageServerDocumentSymbolModelMapper } from "../Models/LanguageServerDocumentSymbolModelMapper.js";

export class SelfHostedEditorDocumentSymbolBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getDocumentSymbols(scriptText) {
    try {
      const response = await fetch("/api/document-symbols", {
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
        throw new Error(`Document symbols request failed with ${response.status}.`);
      }

      const payload = await response.json();
      return {
        provider: "language-server",
        symbols: LanguageServerDocumentSymbolModelMapper.mapSymbols(payload),
      };
    } catch (error) {
      console.warn("SelfHostedEditor document symbols fallback:", error);
      const documentModel = ScriptDocumentModelBuilder.build(scriptText);
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
