import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Models/LocalizationDraftCsvBuilder.js";

export class LocalizationEditorController {
  constructor({
    panelElement,
    draftStore,
    exportDraftButtonElement,
    exportUpdatedButtonElement = null,
    openPreviousCsvButtonElement = null,
    previousCsvInputElement = null,
    previousCsvStatusElement = null,
    reviewBridge = null,
  }) {
    this.panelElement = panelElement;
    this.draftStore = draftStore;
    this.exportDraftButtonElement = exportDraftButtonElement;
    this.exportUpdatedButtonElement = exportUpdatedButtonElement;
    this.openPreviousCsvButtonElement = openPreviousCsvButtonElement;
    this.previousCsvInputElement = previousCsvInputElement;
    this.previousCsvStatusElement = previousCsvStatusElement;
    this.reviewBridge = reviewBridge;
    this.rows = [];
    this.lastReviewProvider = "draft-fallback";
    this.lastScriptText = "";
    this.previousCsvName = "";
    this.previousCsvText = "";
    this.translationChangedHandlers = [];
    this.sourceLineSelectedHandlers = [];

    this.exportDraftButtonElement.addEventListener("click", () => this.exportDraftCsv());
    this.exportUpdatedButtonElement?.addEventListener("click", () => {
      void this.exportUpdatedCsv();
    });
    this.openPreviousCsvButtonElement?.addEventListener("click", () => this.previousCsvInputElement?.click());
    this.previousCsvInputElement?.addEventListener("change", (event) => {
      void this.handlePreviousCsvSelection(event.target?.files?.[0] || null);
    });
    this.renderPreviousCsvStatus();
  }

  onTranslationChanged(handler) {
    this.translationChangedHandlers.push(handler);
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  async render(scriptText) {
    this.lastScriptText = scriptText;
    const documentModel = ScriptDocumentModelBuilder.build(scriptText);
    const reviewSnapshot = this.reviewBridge
      ? await this.reviewBridge.getLocalizationReview(scriptText, this.previousCsvText)
      : null;
    const rows = this.mapReviewRows(reviewSnapshot) || documentModel.translatableLines;
    this.lastReviewProvider = reviewSnapshot?.provider || "draft-fallback";
    this.rows = rows;
    this.exportDraftButtonElement.disabled = rows.length === 0;
    this.syncUpdatedExportAvailability();
    this.renderPreviousCsvStatus();

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
    input.value = this.draftStore.hasDraft(item)
      ? this.draftStore.getTranslation(item)
      : (item.translation || "");

    input.addEventListener("input", () => {
      const nextTranslation = input.value.trim();
      const baseTranslation = item.translation || "";
      if (nextTranslation === baseTranslation) {
        this.draftStore.clearTranslation(item);
      } else {
        this.draftStore.setTranslation(item, nextTranslation);
      }

      item.status = this.draftStore.hasDraft(item)
        ? "draft"
        : (item.reviewStatus || (baseTranslation ? "review" : "empty"));
      const row = input.closest("tr");
      const statusCell = row?.querySelector("td");
      if (statusCell) {
        statusCell.replaceChildren(this.createStatusPill(item));
      }
      this.syncUpdatedExportAvailability();
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
        anchor: item.anchor || "",
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
    this.downloadCsv(csv, "inscape-localization-draft.csv");
  }

  async handlePreviousCsvSelection(file) {
    if (!file) {
      return;
    }

    this.previousCsvName = file.name || "previous.csv";
    this.previousCsvText = await file.text();
    this.renderPreviousCsvStatus();
    this.syncUpdatedExportAvailability();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
  }

  syncUpdatedExportAvailability() {
    if (!this.exportUpdatedButtonElement) {
      return;
    }

    const hasAnchorRows = this.rows.some((row) => row.anchor);
    const hasPreviousCsv = Boolean(this.previousCsvText.trim());
    const hasReviewBridge = Boolean(this.reviewBridge);
    this.exportUpdatedButtonElement.disabled = !hasAnchorRows || !hasPreviousCsv || !hasReviewBridge;
  }

  renderPreviousCsvStatus() {
    if (!this.previousCsvStatusElement) {
      return;
    }

    if (this.previousCsvName) {
      this.previousCsvStatusElement.textContent = `Review baseline: ${this.previousCsvName}`;
      this.previousCsvStatusElement.title = this.previousCsvName;
      return;
    }

    this.previousCsvStatusElement.textContent = "Review baseline: current extract";
    this.previousCsvStatusElement.title = "Review baseline: current extract";
  }

  collectTranslationOverrides() {
    return this.rows
      .filter((row) => row.anchor && this.draftStore.hasDraft(row))
      .map((row) => ({
        anchor: row.anchor,
        translation: this.draftStore.getTranslation(row),
      }));
  }

  async exportUpdatedCsv() {
    if (!this.reviewBridge || !this.previousCsvText.trim() || !this.lastScriptText) {
      return;
    }

    const payload = await this.reviewBridge.exportUpdatedLocalizationCsv(
      this.lastScriptText,
      this.previousCsvText,
      this.collectTranslationOverrides()
    );
    if (payload.provider !== "localization-update" || !payload.csv) {
      console.error("SelfHostedEditor localization update failed:", payload.error || "updated CSV unavailable");
      return;
    }

    this.downloadCsv(payload.csv, this.buildUpdatedCsvFilename());
  }

  buildUpdatedCsvFilename() {
    if (!this.previousCsvName) {
      return "inscape-localization-updated.csv";
    }

    return this.previousCsvName.replace(/(?:\.csv)?$/i, ".updated.csv");
  }

  downloadCsv(csv, filename) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }
}
