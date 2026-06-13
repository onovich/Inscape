export class WorkspaceSummaryHostedModelBuilder {
  static build({
    diagnosticSnapshot = null,
    diagnosticsCount = null,
    localizationDraftStore,
    localizationSummary = null,
    runtimeSnapshot = null,
    storyGraphModel = null,
  }) {
    if (!this.isCompilerProjectGraph(storyGraphModel) || !this.isHostedLocalizationSummary(localizationSummary)) {
      return null;
    }

    const activeNodes = this.getActiveDocumentNodes(storyGraphModel);
    const localizationRows = localizationSummary.rows;
    const nextDiagnosticsCount = diagnosticsCount ?? (Array.isArray(diagnosticSnapshot?.diagnostics)
      ? diagnosticSnapshot.diagnostics.length
      : 0);

    return {
      diagnosticCount: nextDiagnosticsCount,
      draftTranslationCount: localizationDraftStore.countDraftsForRows(localizationRows),
      localizationLineCount: localizationRows.length,
      nodeCount: activeNodes.length,
      provider: "shared",
      sources: {
        diagnosticsProvider: diagnosticSnapshot?.provider || "unavailable",
        localizationProvider: localizationSummary.provider,
        runtimeProvider: runtimeSnapshot?.provider || "unavailable",
        storyGraphProvider: storyGraphModel.provider,
      },
    };
  }

  static isCompilerProjectGraph(storyGraphModel) {
    return storyGraphModel?.provider === "compiler-project" && Array.isArray(storyGraphModel.nodes);
  }

  static isHostedLocalizationSummary(localizationSummary) {
    return localizationSummary?.provider === "localization-review" && Array.isArray(localizationSummary.rows);
  }

  static getActiveDocumentNodes(storyGraphModel) {
    const nodes = Array.isArray(storyGraphModel?.nodes) ? storyGraphModel.nodes : [];
    const activeNodes = nodes.filter((node) => node.isInActiveDocument);
    return activeNodes.length > 0 ? activeNodes : nodes;
  }
}
