export class ProjectWorkspaceSummaryController {
  constructor(summaryElement) {
    this.summaryElement = summaryElement;
  }

  render(summaryModel) {
    const items = [
      [summaryModel.nodeCount, "nodes"],
      [summaryModel.localizationLineCount, "l10n"],
      [summaryModel.draftTranslationCount, "drafts"],
      [summaryModel.diagnosticCount, "diagnostics"],
      [this.getSummaryProviderLabel(summaryModel), "summary"],
    ];

    this.summaryElement.replaceChildren(
      ...items.map(([value, label]) => this.createSummaryItem(value, label, summaryModel))
    );
  }

  createSummaryItem(value, label, summaryModel = null) {
    const item = document.createElement("span");
    item.className = "workspace-summary-item";
    item.textContent = `${value} ${label}`;
    if (label === "summary" && summaryModel?.fallback) {
      item.title = `${summaryModel.fallback.category}: ${summaryModel.fallback.migrationTarget}`;
    }
    return item;
  }

  getSummaryProviderLabel(summaryModel) {
    return summaryModel?.provider === "draft-fallback" ? "draft" : "shared";
  }
}
