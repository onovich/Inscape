import { ScriptDiagnosticsModelBuilder } from "./ScriptDiagnosticsModelBuilder.js";
import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "./ScriptDocumentFallbackPolicy.js";

export class ProjectWorkspaceSummaryModelBuilder {
  static build(scriptText, localizationDraftStore, diagnosticsCount = null) {
    const documentModel = ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
      reason: ScriptDocumentFallbackReason.WorkspaceSummaryStatus,
    });
    const draftTranslationCount = localizationDraftStore.countDraftsForRows(documentModel.translatableLines);
    const nextDiagnosticsCount = diagnosticsCount ?? ScriptDiagnosticsModelBuilder.build(scriptText).length;

    return {
      diagnosticCount: nextDiagnosticsCount,
      draftTranslationCount,
      localizationLineCount: documentModel.translatableLines.length,
      nodeCount: documentModel.nodes.length,
    };
  }
}
