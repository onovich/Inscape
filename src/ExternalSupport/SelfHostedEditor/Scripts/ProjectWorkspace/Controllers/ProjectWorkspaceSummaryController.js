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
    ];

    this.summaryElement.replaceChildren(
      ...items.map(([value, label]) => this.createSummaryItem(value, label))
    );
  }

  createSummaryItem(value, label) {
    const item = document.createElement("span");
    item.className = "workspace-summary-item";
    item.textContent = `${value} ${label}`;
    return item;
  }
}
