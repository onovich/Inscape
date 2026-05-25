import { ScriptDiagnosticsModelBuilder } from "./ScriptDiagnosticsModelBuilder.js";
import { ScriptDocumentModelBuilder } from "./ScriptDocumentModelBuilder.js";

export class ProjectWorkspaceSummaryModelBuilder {
  static build(scriptText, localizationDraftStore, diagnosticsCount = null) {
    const documentModel = ScriptDocumentModelBuilder.build(scriptText);
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
