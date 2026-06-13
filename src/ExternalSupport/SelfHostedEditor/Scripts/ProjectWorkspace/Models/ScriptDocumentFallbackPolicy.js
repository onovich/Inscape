import { ScriptDocumentModelBuilder } from "./ScriptDocumentModelBuilder.js";

export const ScriptDocumentFallbackCategory = Object.freeze({
  HostedBridgeUnavailable: "hosted bridge unavailable fallback",
  OfflineOnlyUi: "offline-only UI convenience",
});

export const ScriptDocumentFallbackReason = Object.freeze({
  DiagnosticsLanguageServerUnavailable: "diagnostics-language-server-unavailable",
  DocumentSymbolsLanguageServerUnavailable: "document-symbols-language-server-unavailable",
  EditorAuthoringSurface: "editor-authoring-surface-offline-model",
  LocalizationReviewUnavailable: "localization-review-unavailable",
  PreviewCompilerGraphUnavailable: "preview-compiler-graph-unavailable",
  StoryGraphCompilerGraphUnavailable: "story-graph-compiler-graph-unavailable",
  WorkspaceSummaryStatus: "workspace-summary-status",
});

const reasonCatalog = Object.freeze({
  [ScriptDocumentFallbackReason.DiagnosticsLanguageServerUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
    owner: "LanguageServer diagnostics bridge",
  }),
  [ScriptDocumentFallbackReason.DocumentSymbolsLanguageServerUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
    owner: "LanguageServer document symbols bridge",
  }),
  [ScriptDocumentFallbackReason.EditorAuthoringSurface]: Object.freeze({
    category: ScriptDocumentFallbackCategory.OfflineOnlyUi,
    owner: "Editor authoring surface",
  }),
  [ScriptDocumentFallbackReason.LocalizationReviewUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
    owner: "Localization review table",
  }),
  [ScriptDocumentFallbackReason.PreviewCompilerGraphUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
    owner: "Preview panel",
  }),
  [ScriptDocumentFallbackReason.StoryGraphCompilerGraphUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.HostedBridgeUnavailable,
    owner: "Story graph panel",
  }),
  [ScriptDocumentFallbackReason.WorkspaceSummaryStatus]: Object.freeze({
    category: ScriptDocumentFallbackCategory.OfflineOnlyUi,
    owner: "Workspace summary status",
  }),
});

export class ScriptDocumentFallbackPolicy {
  static build(scriptText, options = {}) {
    const reason = this.requireReason(options.reason);
    return {
      documentModel: ScriptDocumentModelBuilder.build(scriptText, options.lineIdentityProvider || null),
      reason,
    };
  }

  static buildDocumentModel(scriptText, options = {}) {
    return this.build(scriptText, options).documentModel;
  }

  static getReasonCatalog() {
    return reasonCatalog;
  }

  static requireReason(reason) {
    if (!Object.prototype.hasOwnProperty.call(reasonCatalog, reason)) {
      throw new Error(`ScriptDocumentModelBuilder fallback reason is required and must be registered. Received: ${String(reason || "")}`);
    }

    return reasonCatalog[reason];
  }
}
