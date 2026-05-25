import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Models/LocalizationDraftCsvBuilder.js";

export class LocalizationEditorController {
  constructor(panelElement, draftStore, exportButtonElement) {
    this.panelElement = panelElement;
    this.draftStore = draftStore;
    this.exportButtonElement = exportButtonElement;
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

  render(scriptText) {
    const documentModel = ScriptDocumentModelBuilder.build(scriptText);
    const rows = documentModel.translatableLines;
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
    for (const label of ["Status", "Node", "Line", "Kind", "Source text", "Translation draft"]) {
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

    row.append(status, node, line, kind, text, translation);
    return row;
  }

  createStatusPill(item) {
    const pill = document.createElement("span");
    const status = this.draftStore.getStatus(item);
    pill.className = `status-pill status-pill-${status}`;
    pill.textContent = status;
    return pill;
  }

  createTranslationInput(item) {
    const input = document.createElement("input");
    input.className = "localization-translation-input";
    input.placeholder = "Translation draft";
    input.type = "text";
    input.value = this.draftStore.getTranslation(item);

    input.addEventListener("input", () => {
      this.draftStore.setTranslation(item, input.value.trim());
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
