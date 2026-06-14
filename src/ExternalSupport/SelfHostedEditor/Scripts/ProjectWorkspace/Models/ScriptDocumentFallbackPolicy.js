import { ScriptDocumentModelBuilder } from "./ScriptDocumentModelBuilder.js";

export const ScriptDocumentFallbackCategory = Object.freeze({
  OfflineOnly: "offline-only",
  TemporaryHostedFallback: "temporary-hosted-fallback",
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
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Keep draft diagnostics visible only when the LanguageServer diagnostics bridge is unavailable.",
    owner: "LanguageServer diagnostics bridge",
  }),
  [ScriptDocumentFallbackReason.DocumentSymbolsLanguageServerUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Prefer LanguageServer document symbols and show draft outline only as an unavailable-state fallback.",
    owner: "LanguageServer document symbols bridge",
  }),
  [ScriptDocumentFallbackReason.EditorAuthoringSurface]: Object.freeze({
    category: ScriptDocumentFallbackCategory.OfflineOnly,
    migrationTarget: "Retain for browser-only editor geometry, line hints, and offline authoring surface state.",
    owner: "Editor authoring surface",
  }),
  [ScriptDocumentFallbackReason.LocalizationReviewUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Prefer the Tooling localization presenter and keep draft rows separate when review is unavailable.",
    owner: "Localization review table",
  }),
  [ScriptDocumentFallbackReason.PreviewCompilerGraphUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Prefer Compiler graph and Runtime-backed preview; malformed shared payloads remain explicit errors.",
    owner: "Preview panel",
  }),
  [ScriptDocumentFallbackReason.StoryGraphCompilerGraphUnavailable]: Object.freeze({
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Prefer Compiler project graph and keep draft graph rendering as offline graph preview only.",
    owner: "Story graph panel",
  }),
  [ScriptDocumentFallbackReason.WorkspaceSummaryStatus]: Object.freeze({
    category: ScriptDocumentFallbackCategory.TemporaryHostedFallback,
    migrationTarget: "Use hosted summary when Compiler graph and localization presenter inputs are available; draft summary is only for hosted summary inputs unavailable.",
    owner: "Workspace summary hosted aggregation",
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
