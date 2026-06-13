import { ScriptDiagnosticsModelBuilder } from "./ScriptDiagnosticsModelBuilder.js";
import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "./ScriptDocumentFallbackPolicy.js";

export class ProjectWorkspaceSummaryModelBuilder {
  static build(scriptText, localizationDraftStore, diagnosticsCount = null) {
    const fallback = ScriptDocumentFallbackPolicy.build(scriptText, {
      reason: ScriptDocumentFallbackReason.WorkspaceSummaryStatus,
    });
    const documentModel = fallback.documentModel;
    const draftTranslationCount = localizationDraftStore.countDraftsForRows(documentModel.translatableLines);
    const nextDiagnosticsCount = diagnosticsCount ?? ScriptDiagnosticsModelBuilder.build(scriptText).length;

    return {
      diagnosticCount: nextDiagnosticsCount,
      draftTranslationCount,
      fallback: {
        category: fallback.reason.category,
        migrationTarget: fallback.reason.migrationTarget,
        owner: fallback.reason.owner,
        reason: ScriptDocumentFallbackReason.WorkspaceSummaryStatus,
      },
      localizationLineCount: documentModel.translatableLines.length,
      nodeCount: documentModel.nodes.length,
      provider: "draft-fallback",
    };
  }
}
