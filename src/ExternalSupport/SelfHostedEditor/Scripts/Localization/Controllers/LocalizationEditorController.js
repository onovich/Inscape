import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";
import { LocalizationCsvFileController } from "./LocalizationCsvFileController.js";
import { LocalizationDraftCsvBuilder } from "../Models/LocalizationDraftCsvBuilder.js";
import { LocalizationExportReadinessModelBuilder } from "../Models/LocalizationExportReadinessModelBuilder.js";
import { LocalizationReviewRowsModelBuilder } from "../Models/LocalizationReviewRowsModelBuilder.js";
import { LocalizationVisibleRowsModelBuilder } from "../Models/LocalizationVisibleRowsModelBuilder.js";
import { LocalizationTableRenderer } from "../Renderers/LocalizationTableRenderer.js";

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
    this.translationChangedHandlers = [];
    this.sourceLineSelectedHandlers = [];
    this.tableRenderer = new LocalizationTableRenderer({
      draftStore: this.draftStore,
      getRowKey: (item) => this.getRowKey(item),
      getRowStatus: (item) => this.getRowStatus(item),
      onReviewAction: (action, item, detailElement) => this.handleReviewAction(action, item, detailElement),
      onSourceLineSelected: (lineNumber) => this.notifySourceLineSelected(lineNumber),
      onTranslationInput: (item, nextTranslation, rowElement) =>
        this.handleTranslationInput(item, nextTranslation, rowElement),
    });
    this.csvFileController = new LocalizationCsvFileController({
      draftStore: this.draftStore,
      getLastScriptText: () => this.lastScriptText,
      getRows: () => this.rows,
      getUpdatedExportReadiness: () => this.getUpdatedExportReadiness(),
      onLinkedCsvReplaced: () => this.handleLinkedCsvReplaced(),
      onPreviousCsvChanged: () => this.handlePreviousCsvChanged(),
      previousCsvInputElement: this.previousCsvInputElement,
      reviewBridge: this.reviewBridge,
    });

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
    const documentModel = ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
      reason: ScriptDocumentFallbackReason.LocalizationReviewUnavailable,
    });
    const reviewSnapshot = this.reviewBridge
      ? await this.reviewBridge.getLocalizationReview(scriptText, this.csvFileController.previousCsvText)
      : null;
    const reviewRows = this.mapReviewRows(reviewSnapshot);
    const hasHostedReviewRows = Array.isArray(reviewRows);
    const rows = hasHostedReviewRows ? reviewRows : documentModel.translatableLines;
    this.lastReviewProvider = hasHostedReviewRows ? "localization-review" : "draft-fallback";
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

    const tableView = this.tableRenderer.render(rows);
    this.panelElement.replaceChildren(tableView.shell);
    this.tableBodyElement = tableView.tableBodyElement;
    this.filterEmptyStateElement = tableView.filterEmptyStateElement;
    this.applyRowFilters();
  }

  handleReviewAction(action, item, detailElement) {
    if (action.actionKey === "show-candidate-diff") {
      const text = action.detail || action.summary || "No candidate diff available.";
      const isSameVisibleText = !detailElement.className.includes("is-hidden") && detailElement.textContent === text;
      detailElement.textContent = text;
      detailElement.classList.toggle("is-hidden", isSameVisibleText);
      return;
    }

    this.notifySourceSelection({
      column: Number(action.column || 1),
      length: Number(action.length || 0),
      lineNumber: Number(action.lineNumber || action.line || item.sourceLine || 1),
      sourcePath: action.sourcePath || item.sourcePath || "",
    });
  }

  handleTranslationInput(item, nextTranslation, rowElement) {
    const baseTranslation = item.translation || "";
    if (nextTranslation === baseTranslation) {
      this.draftStore.clearTranslation(item);
    } else {
      this.draftStore.setTranslation(item, nextTranslation);
    }

    this.tableRenderer.updateRowStatusCell(rowElement, item);
    this.applyRowFilters();
    this.syncUpdatedExportAvailability();
    this.renderPreviousCsvStatus();
    this.notifyTranslationChanged();
  }

  createEmptyState() {
    const panel = document.createElement("div");
    panel.className = "placeholder-panel";
    panel.innerHTML = "<h1>No localization rows</h1><p>The current script does not expose translatable preview rows yet.</p>";
    return panel;
  }

  notifySourceLineSelected(lineNumber) {
    this.notifySourceSelection({
      lineNumber,
      sourcePath: "",
    });
  }

  notifySourceSelection(selection) {
    for (const handler of this.sourceLineSelectedHandlers) {
      handler(selection);
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
    return LocalizationVisibleRowsModelBuilder.getVisibleRows(this.rows, this.filterMode, this.draftStore);
  }

  getSummarySnapshot() {
    return {
      provider: this.lastReviewProvider,
      rows: this.rows,
    };
  }

  mapReviewRows(reviewSnapshot) {
    return LocalizationReviewRowsModelBuilder.build(reviewSnapshot);
  }

  exportDraftCsv() {
    const csv = LocalizationDraftCsvBuilder.build(this.rows, this.draftStore);
    this.csvFileController.downloadCsv(csv, "inscape-localization-draft.csv");
  }

  async applyPreviousCsvSelection(file, fileHandle = null) {
    await this.csvFileController.applyPreviousCsvSelection(file, fileHandle);
  }

  async openPreviousCsv() {
    await this.csvFileController.openPreviousCsv();
  }

  async handlePreviousCsvChanged() {
    this.renderPreviousCsvStatus();
    this.syncUpdatedExportAvailability();
    this.syncReplacePreviousCsvAvailability();
    this.renderSessionStatus();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
  }

  async handleLinkedCsvReplaced() {
    this.syncUpdatedExportAvailability();
    this.syncReplacePreviousCsvAvailability();
    this.renderPreviousCsvStatus();
    this.renderSessionStatus();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
    this.notifyTranslationChanged();
  }

  syncUpdatedExportAvailability() {
    if (!this.exportUpdatedButtonElement) {
      return;
    }

    const hasAnchorRows = this.rows.some((row) => row.anchor);
    const hasPreviousCsv = Boolean(this.csvFileController.previousCsvText.trim());
    const hasReviewBridge = Boolean(this.reviewBridge);
    const hasHostedReview = this.lastReviewProvider === "localization-review";
    const readiness = this.getUpdatedExportReadiness();
    this.exportUpdatedButtonElement.disabled = !(hasAnchorRows && hasPreviousCsv && hasReviewBridge && hasHostedReview);
    this.exportUpdatedButtonElement.title = readiness;
  }

  renderPreviousCsvStatus() {
    if (!this.previousCsvStatusElement) {
      return;
    }

    if (this.csvFileController.previousCsvName) {
      const linkSummary = this.getLinkedPreviousCsvSummary();
      const handleSuffix = linkSummary ? ` | ${linkSummary}` : "";
      this.previousCsvStatusElement.textContent = `Review baseline: ${this.csvFileController.previousCsvName}${handleSuffix}`;
      this.previousCsvStatusElement.title = `${this.csvFileController.previousCsvName}${handleSuffix}`;
      return;
    }

    this.previousCsvStatusElement.textContent = "Review baseline: current extract";
    this.previousCsvStatusElement.title = "Review baseline: current extract";
  }

  collectTranslationOverrides() {
    return this.csvFileController.collectTranslationOverrides();
  }

  async clearVisibleDrafts() {
    const visibleDraftRows = this.getVisibleDraftRows();
    if (visibleDraftRows.length === 0) {
      return;
    }

    this.draftStore.clearDraftsForRows(visibleDraftRows);
    this.syncUpdatedExportAvailability();
    this.syncClearVisibleDraftsAvailability();
    this.syncReplacePreviousCsvAvailability();
    this.renderPreviousCsvStatus();
    this.renderSessionStatus();
    if (this.lastScriptText) {
      await this.render(this.lastScriptText);
    }
    this.notifyTranslationChanged();
  }

  async exportUpdatedCsv() {
    await this.csvFileController.exportUpdatedCsv();
  }

  async replacePreviousCsv() {
    await this.csvFileController.replacePreviousCsv();
  }

  getRowStatus(item) {
    return LocalizationVisibleRowsModelBuilder.getRowStatus(item, this.draftStore);
  }

  normalizeFilterMode(filterMode) {
    return LocalizationVisibleRowsModelBuilder.normalizeFilterMode(filterMode);
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
    this.renderPreviousCsvStatus();
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
    const replaceSummary = this.getReplaceSessionSummary();
    this.sessionStatusElement.textContent = `${draftSummary} | ${this.getUpdatedExportReadiness()} | ${replaceSummary}`;
    this.sessionStatusElement.title = this.sessionStatusElement.textContent;
    this.sessionStatusElement.dataset.visibleRowCount = String(visibleRowCount);
  }

  buildFilterLabel() {
    return LocalizationVisibleRowsModelBuilder.buildFilterLabel(this.filterMode);
  }

  getRowKey(item) {
    return LocalizationVisibleRowsModelBuilder.getRowKey(item);
  }

  getVisibleDraftRows() {
    return LocalizationVisibleRowsModelBuilder.getVisibleDraftRows(this.rows, this.filterMode, this.draftStore);
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
    return LocalizationExportReadinessModelBuilder.getUpdatedExportReadiness({
      previousCsvText: this.csvFileController.previousCsvText,
      reviewBridge: this.reviewBridge,
      reviewProvider: this.lastReviewProvider,
      rows: this.rows,
    });
  }

  getDirectReplaceReadiness() {
    return LocalizationExportReadinessModelBuilder.getDirectReplaceReadiness({
      draftStore: this.draftStore,
      previousCsvFileHandle: this.csvFileController.previousCsvFileHandle,
      previousCsvText: this.csvFileController.previousCsvText,
      reviewBridge: this.reviewBridge,
      reviewProvider: this.lastReviewProvider,
      rows: this.rows,
    });
  }

  getLinkedPreviousCsvSummary() {
    return LocalizationExportReadinessModelBuilder.getLinkedPreviousCsvSummary({
      draftStore: this.draftStore,
      previousCsvFileHandle: this.csvFileController.previousCsvFileHandle,
      rows: this.rows,
    });
  }

  getReplaceSessionSummary() {
    return LocalizationExportReadinessModelBuilder.getReplaceSessionSummary({
      draftStore: this.draftStore,
      previousCsvFileHandle: this.csvFileController.previousCsvFileHandle,
      rows: this.rows,
    });
  }

}
