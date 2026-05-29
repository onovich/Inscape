import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";
import { LocalizationDraftCsvBuilder } from "../Models/LocalizationDraftCsvBuilder.js";

export class LocalizationEditorController {
  constructor({
    panelElement,
    draftStore,
    clearVisibleDraftsButtonElement = null,
    exportDraftButtonElement,
    exportUpdatedButtonElement = null,
    filterModeElement = null,
    filterSummaryElement = null,
    openPreviousCsvButtonElement = null,
    previousCsvInputElement = null,
    previousCsvStatusElement = null,
    replacePreviousCsvButtonElement = null,
    sessionStatusElement = null,
    reviewBridge = null,
  }) {
    this.panelElement = panelElement;
    this.draftStore = draftStore;
    this.clearVisibleDraftsButtonElement = clearVisibleDraftsButtonElement;
    this.exportDraftButtonElement = exportDraftButtonElement;
    this.exportUpdatedButtonElement = exportUpdatedButtonElement;
    this.filterModeElement = filterModeElement;
    this.filterSummaryElement = filterSummaryElement;
    this.openPreviousCsvButtonElement = openPreviousCsvButtonElement;
    this.previousCsvInputElement = previousCsvInputElement;
    this.previousCsvStatusElement = previousCsvStatusElement;
    this.replacePreviousCsvButtonElement = replacePreviousCsvButtonElement;
    this.sessionStatusElement = sessionStatusElement;
    this.reviewBridge = reviewBridge;
    this.filterMode = "all";
    this.rows = [];
    this.tableBodyElement = null;
    this.filterEmptyStateElement = null;
    this.lastReviewProvider = "draft-fallback";
    this.lastScriptText = "";
    this.previousCsvFileHandle = null;
    this.previousCsvName = "";
    this.previousCsvText = "";
    this.translationChangedHandlers = [];
    this.sourceLineSelectedHandlers = [];

    this.exportDraftButtonElement.addEventListener("click", () => this.exportDraftCsv());
    this.exportUpdatedButtonElement?.addEventListener("click", () => {
      void this.exportUpdatedCsv();
    });
    this.clearVisibleDraftsButtonElement?.addEventListener("click", () => {
      void this.clearVisibleDrafts();
    });
    this.filterModeElement?.addEventListener("change", () => {
      this.setFilterMode(this.filterModeElement.value);
    });
    this.openPreviousCsvButtonElement?.addEventListener("click", () => {
      void this.openPreviousCsv();
    });
    this.previousCsvInputElement?.addEventListener("change", (event) => {
      void this.applyPreviousCsvSelection(event.target?.files?.[0] || null);
    });
    this.replacePreviousCsvButtonElement?.addEventListener("click", () => {
      void this.replacePreviousCsv();
    });
    this.renderPreviousCsvStatus();
    this.renderFilterSummary();
    this.renderSessionStatus();
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
    this.updateFilterControl();

    if (rows.length === 0) {
      this.tableBodyElement = null;
      this.filterEmptyStateElement = null;
      this.renderFilterSummary();
      this.syncClearVisibleDraftsAvailability();
      this.syncReplacePreviousCsvAvailability();
      this.renderSessionStatus();
      this.panelElement.replaceChildren(this.createEmptyState());
      return;
    }

    const shell = document.createElement("div");
    shell.className = "localization-table-shell";
    const table = document.createElement("table");
    table.className = "localization-table";
    table.append(this.createHeader());
    const body = document.createElement("tbody");

    for (const row of rows) {
      body.append(this.createRow(row));
    }

    table.append(body);
    const filterEmptyState = document.createElement("div");
    filterEmptyState.className = "localization-filter-empty is-hidden";
    filterEmptyState.textContent = "No rows match the current filter.";
    shell.append(table, filterEmptyState);
    this.panelElement.replaceChildren(shell);
    this.tableBodyElement = body;
    this.filterEmptyStateElement = filterEmptyState;
    this.applyRowFilters();
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
    this.updateRowStatusState(row, item);

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
    const status = this.getRowStatus(item);
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

      const row = input.closest("tr");
      const statusCell = row?.children?.[0] || null;
      if (statusCell) {
        statusCell.replaceChildren(this.createStatusPill(item));
      }
      if (row) {
        this.updateRowStatusState(row, item);
      }
      this.applyRowFilters();
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

  setFilterMode(filterMode) {
    this.filterMode = this.normalizeFilterMode(filterMode);
    this.updateFilterControl();
    this.applyRowFilters();
  }

  getVisibleRows() {
    return this.rows.filter((row) => this.matchesFilter(row));
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
    await this.applyPreviousCsvSelection(file, null);
  }

  async applyPreviousCsvSelection(file, fileHandle = null) {
    if (!file) {
      return;
    }

    this.previousCsvName = file.name || "previous.csv";
    this.previousCsvText = await file.text();
    this.previousCsvFileHandle = fileHandle;
    this.renderPreviousCsvStatus();
    this.syncUpdatedExportAvailability();
    this.syncReplacePreviousCsvAvailability();
    this.renderSessionStatus();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
  }

  async openPreviousCsv() {
    if (this.supportsNativeFileHandles()) {
      try {
        const handles = await globalThis.window.showOpenFilePicker({
          excludeAcceptAllOption: true,
          multiple: false,
          types: [
            {
              accept: {
                "text/csv": [".csv"],
              },
              description: "CSV files",
            },
          ],
        });
        const fileHandle = Array.isArray(handles) ? handles[0] : null;
        const file = fileHandle ? await fileHandle.getFile() : null;
        await this.applyPreviousCsvSelection(file, fileHandle);
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        console.error("SelfHostedEditor previous CSV picker failed:", error);
      }
    }

    this.previousCsvInputElement?.click();
  }

  syncUpdatedExportAvailability() {
    if (!this.exportUpdatedButtonElement) {
      return;
    }

    const hasAnchorRows = this.rows.some((row) => row.anchor);
    const hasPreviousCsv = Boolean(this.previousCsvText.trim());
    const hasReviewBridge = Boolean(this.reviewBridge);
    const readiness = this.getUpdatedExportReadiness();
    this.exportUpdatedButtonElement.disabled = !(hasAnchorRows && hasPreviousCsv && hasReviewBridge);
    this.exportUpdatedButtonElement.title = readiness;
  }

  renderPreviousCsvStatus() {
    if (!this.previousCsvStatusElement) {
      return;
    }

    if (this.previousCsvName) {
      const handleSuffix = this.previousCsvFileHandle ? " | linked" : "";
      this.previousCsvStatusElement.textContent = `Review baseline: ${this.previousCsvName}${handleSuffix}`;
      this.previousCsvStatusElement.title = `${this.previousCsvName}${handleSuffix}`;
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

  async clearVisibleDrafts() {
    const visibleDraftRows = this.getVisibleDraftRows();
    if (visibleDraftRows.length === 0) {
      return;
    }

    this.draftStore.clearDraftsForRows(visibleDraftRows);
    this.syncUpdatedExportAvailability();
    this.syncClearVisibleDraftsAvailability();
    this.renderSessionStatus();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
    this.notifyTranslationChanged();
  }

  async exportUpdatedCsv() {
    const payload = await this.getUpdatedCsvPayload();
    if (payload.provider !== "localization-update" || !payload.csv) {
      console.error("SelfHostedEditor localization update failed:", payload.error || "updated CSV unavailable");
      return;
    }

    this.downloadCsv(payload.csv, this.buildUpdatedCsvFilename());
  }

  async replacePreviousCsv() {
    if (!this.previousCsvFileHandle) {
      return;
    }

    const payload = await this.getUpdatedCsvPayload();
    if (payload.provider !== "localization-update" || !payload.csv) {
      console.error("SelfHostedEditor localization replace failed:", payload.error || "updated CSV unavailable");
      return;
    }

    try {
      const writable = await this.previousCsvFileHandle.createWritable();
      await writable.write(payload.csv);
      await writable.close();
      this.previousCsvText = payload.csv;
      this.draftStore.clearDraftsForRows(this.rows.filter((row) => row.anchor && this.draftStore.hasDraft(row)));
      this.syncUpdatedExportAvailability();
      this.syncReplacePreviousCsvAvailability();
      this.renderPreviousCsvStatus();
      this.renderSessionStatus();
      if (this.lastScriptText) {
        await this.render(this.lastScriptText);
      }
      this.notifyTranslationChanged();
    } catch (error) {
      console.error("SelfHostedEditor previous CSV replace failed:", error);
    }
  }

  async getUpdatedCsvPayload() {
    if (!this.reviewBridge || !this.previousCsvText.trim() || !this.lastScriptText) {
      return {
        csv: "",
        error: this.getUpdatedExportReadiness(),
        provider: "localization-update-unavailable",
      };
    }

    return this.reviewBridge.exportUpdatedLocalizationCsv(
      this.lastScriptText,
      this.previousCsvText,
      this.collectTranslationOverrides()
    );
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

  getRowStatus(item) {
    if (this.draftStore.hasDraft(item)) {
      return "draft";
    }

    if (item.reviewStatus) {
      return item.reviewStatus;
    }

    return item.translation ? "review" : "empty";
  }

  normalizeFilterMode(filterMode) {
    const value = String(filterMode || "").trim().toLowerCase();
    const allowedValues = new Set([
      "all",
      "actionable",
      "draft",
      "empty",
      "review",
      "kept",
      "new",
      "changed",
      "conflict",
      "stale",
      "removed",
    ]);
    return allowedValues.has(value) ? value : "all";
  }

  updateFilterControl() {
    if (!this.filterModeElement) {
      return;
    }

    this.filterModeElement.value = this.filterMode;
  }

  applyRowFilters() {
    const visibleRows = this.getVisibleRows();
    const visibleRowKeys = new Set(visibleRows.map((row) => this.getRowKey(row)));
    for (const rowElement of this.tableBodyElement?.children || []) {
      const rowKey = rowElement.dataset.rowKey || "";
      rowElement.hidden = !visibleRowKeys.has(rowKey);
    }

    if (this.filterEmptyStateElement) {
      this.filterEmptyStateElement.classList.toggle("is-hidden", visibleRows.length > 0);
    }

    this.renderFilterSummary(visibleRows.length);
    this.syncClearVisibleDraftsAvailability();
    this.syncReplacePreviousCsvAvailability();
    this.renderSessionStatus(visibleRows.length);
  }

  renderFilterSummary(visibleRowCount = this.getVisibleRows().length) {
    if (!this.filterSummaryElement) {
      return;
    }

    const totalCount = this.rows.length;
    const filterLabel = this.buildFilterLabel();
    this.filterSummaryElement.textContent = filterLabel === "All rows"
      ? `Showing ${visibleRowCount} of ${totalCount} rows`
      : `Showing ${visibleRowCount} of ${totalCount} rows | ${filterLabel}`;
  }

  renderSessionStatus(visibleRowCount = this.getVisibleRows().length) {
    if (!this.sessionStatusElement) {
      return;
    }

    const draftEntryCount = this.draftStore.countDraftEntriesForRows(this.rows);
    const visibleDraftEntryCount = this.getVisibleDraftRows().length;
    const draftSummary = visibleDraftEntryCount === draftEntryCount
      ? `${draftEntryCount} overrides in session`
      : `${draftEntryCount} overrides in session | ${visibleDraftEntryCount} visible`;
    const replaceSummary = this.previousCsvFileHandle
      ? "Replace linked"
      : "Replace needs linked baseline";
    this.sessionStatusElement.textContent = `${draftSummary} | ${this.getUpdatedExportReadiness()} | ${replaceSummary}`;
    this.sessionStatusElement.title = this.sessionStatusElement.textContent;
    this.sessionStatusElement.dataset.visibleRowCount = String(visibleRowCount);
  }

  buildFilterLabel() {
    switch (this.filterMode) {
      case "actionable":
        return "Needs action";
      case "draft":
        return "Drafts";
      case "empty":
        return "Empty";
      case "review":
        return "Review";
      case "kept":
        return "Kept";
      case "new":
        return "New";
      case "changed":
        return "Changed";
      case "conflict":
        return "Conflict";
      case "stale":
        return "Stale";
      case "removed":
        return "Removed";
      default:
        return "All rows";
    }
  }

  matchesFilter(item) {
    const status = this.getRowStatus(item);
    switch (this.filterMode) {
      case "actionable":
        return ["draft", "empty", "new", "changed", "conflict", "stale", "removed"].includes(status);
      case "all":
        return true;
      default:
        return status === this.filterMode;
    }
  }

  updateRowStatusState(rowElement, item) {
    const status = this.getRowStatus(item);
    rowElement.dataset.rowKey = this.getRowKey(item);
    rowElement.dataset.status = status;
  }

  getRowKey(item) {
    if (item.anchor) {
      return `anchor:${item.anchor}`;
    }

    return `${item.nodeTitle}:${item.sourceLine}:${item.kind}:${item.text}`;
  }

  getVisibleDraftRows() {
    return this.getVisibleRows().filter((row) => this.draftStore.hasDraft(row));
  }

  syncClearVisibleDraftsAvailability() {
    if (!this.clearVisibleDraftsButtonElement) {
      return;
    }

    const visibleDraftRowCount = this.getVisibleDraftRows().length;
    this.clearVisibleDraftsButtonElement.disabled = visibleDraftRowCount === 0;
    this.clearVisibleDraftsButtonElement.title = visibleDraftRowCount > 0
      ? `Clear ${visibleDraftRowCount} visible draft overrides`
      : "No visible draft overrides to clear";
  }

  syncReplacePreviousCsvAvailability() {
    if (!this.replacePreviousCsvButtonElement) {
      return;
    }

    const isReady = this.getDirectReplaceReadiness() === "Replace previous CSV ready";
    this.replacePreviousCsvButtonElement.disabled = !isReady;
    this.replacePreviousCsvButtonElement.title = this.getDirectReplaceReadiness();
  }

  getUpdatedExportReadiness() {
    if (!this.reviewBridge) {
      return "Updated export unavailable in draft fallback mode";
    }

    if (this.rows.length === 0) {
      return "Updated export needs localization rows";
    }

    if (!this.rows.some((row) => row.anchor)) {
      return "Updated export needs anchored review rows";
    }

    if (!this.previousCsvText.trim()) {
      return "Updated export needs previous CSV";
    }

    return "Updated export ready";
  }

  getDirectReplaceReadiness() {
    if (!this.previousCsvFileHandle) {
      return "Replace previous CSV needs a linked previous CSV";
    }

    if (this.getUpdatedExportReadiness() !== "Updated export ready") {
      return this.getUpdatedExportReadiness();
    }

    return "Replace previous CSV ready";
  }

  supportsNativeFileHandles() {
    return typeof globalThis.window?.showOpenFilePicker === "function";
  }
}
