import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Models/LocalizationDraftCsvBuilder.js";

export class LocalizationEditorController {
  constructor(panelElement, draftStore, exportButtonElement, reviewBridge = null) {
    this.panelElement = panelElement;
    this.draftStore = draftStore;
    this.exportButtonElement = exportButtonElement;
    this.reviewBridge = reviewBridge;
    this.rows = [];
    this.translationChangedHandlers = [];
    this.sourceLineSelectedHandlers = [];

    this.exportButtonElement.addEventListener("click", () => this.exportDraftCsv());
  }

  onTranslationChanged(handler) {
    this.translationChangedHandlers.push(handler);
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  async render(scriptText) {
    const documentModel = ScriptDocumentModelBuilder.build(scriptText);
    const reviewSnapshot = this.reviewBridge
      ? await this.reviewBridge.getLocalizationReview(scriptText)
      : null;
    const rows = this.mapReviewRows(reviewSnapshot) || documentModel.translatableLines;
    this.rows = rows;
    this.exportButtonElement.disabled = rows.length === 0;

    if (rows.length === 0) {
      this.panelElement.replaceChildren(this.createEmptyState());
      return;
    }

    const table = document.createElement("table");
    table.className = "localization-table";
    table.append(this.createHeader());
    const body = document.createElement("tbody");

    for (const row of rows) {
      body.append(this.createRow(row));
    }

    table.append(body);
    this.panelElement.replaceChildren(table);
  }

  createHeader() {
    const head = document.createElement("thead");
    const row = document.createElement("tr");
    for (const label of ["Status", "Review", "Node", "Line", "Kind", "Source text", "Translation draft"]) {
      const cell = document.createElement("th");
      cell.textContent = label;
      row.append(cell);
    }
    head.append(row);
    return head;
  }

  createRow(item) {
    const row = document.createElement("tr");
    row.dataset.sourceLine = String(item.sourceLine);

    const status = document.createElement("td");
    status.append(this.createStatusPill(item));

    const review = document.createElement("td");
    review.className = "localization-review-summary";
    review.textContent = item.reviewSummary || item.review || "draft";
    if (item.reviewDetail) {
      review.title = item.reviewDetail;
    }

    const node = document.createElement("td");
    node.textContent = item.nodeTitle;

    const line = document.createElement("td");
    line.textContent = String(item.sourceLine);

    const kind = document.createElement("td");
    kind.textContent = item.kind;

    const text = document.createElement("td");
    text.className = "localization-source-text";
    text.textContent = item.speaker ? `${item.speaker}：${item.text}` : item.text;

    const translation = document.createElement("td");
    translation.append(this.createTranslationInput(item));

    row.append(status, review, node, line, kind, text, translation);
    return row;
  }

  createStatusPill(item) {
    const pill = document.createElement("span");
    const status = item.status || this.draftStore.getStatus(item);
    pill.className = `status-pill status-pill-${status}`;
    pill.textContent = status;
    return pill;
  }

  createTranslationInput(item) {
    const input = document.createElement("input");
    input.className = "localization-translation-input";
    input.placeholder = "Translation draft";
    input.type = "text";
    input.value = this.draftStore.getTranslation(item) || item.translation || "";

    input.addEventListener("input", () => {
      this.draftStore.setTranslation(item, input.value.trim());
      item.status = input.value.trim() ? "draft" : (item.reviewStatus || "empty");
      const row = input.closest("tr");
      const statusCell = row?.querySelector("td");
      if (statusCell) {
        statusCell.replaceChildren(this.createStatusPill(item));
      }
      this.notifyTranslationChanged();
    });

    input.addEventListener("focus", () => this.notifySourceLineSelected(item.sourceLine));
    return input;
  }

  createEmptyState() {
    const panel = document.createElement("div");
    panel.className = "placeholder-panel";
    panel.innerHTML = "<h1>No localization rows</h1><p>The current script does not expose translatable preview rows yet.</p>";
    return panel;
  }

  notifySourceLineSelected(lineNumber) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler(lineNumber);
    }
  }

  notifyTranslationChanged() {
    for (const handler of this.translationChangedHandlers) {
      handler();
    }
  }

  mapReviewRows(reviewSnapshot) {
    const presenterItems = reviewSnapshot?.review?.presenter?.items;
    if (!Array.isArray(presenterItems) || presenterItems.length === 0) {
      return null;
    }

    return presenterItems.map((presenterItem) => {
      const item = presenterItem.item || {};
      const status = item.status || "review";
      return {
        kind: this.normalizeKind(item.kind),
        nodeTitle: item.nodeTitle || "",
        review: item.review || "",
        reviewDetail: presenterItem.detail || "",
        reviewStatus: status,
        reviewSummary: presenterItem.summary || "",
        sourceLine: Number(item.line || presenterItem.line || 1),
        speaker: item.speaker || "",
        status,
        text: item.text || "",
        translation: item.translation || "",
      };
    });
  }

  normalizeKind(kind) {
    const text = String(kind || "");
    if (!text) {
      return "";
    }

    return text.charAt(0).toLowerCase() + text.slice(1).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  exportDraftCsv() {
    const csv = LocalizationDraftCsvBuilder.build(this.rows, this.draftStore);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inscape-localization-draft.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
