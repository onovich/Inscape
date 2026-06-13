import { ProjectWorkspaceDraftSummaryModelBuilder } from "./ProjectWorkspaceDraftSummaryModelBuilder.js";

export class ProjectWorkspaceSummaryModelBuilder {
  static build(scriptText, localizationDraftStore, diagnosticsCount = null) {
    return ProjectWorkspaceDraftSummaryModelBuilder.build(scriptText, localizationDraftStore, diagnosticsCount);
  }
}
