export class LocalizationExportReadinessModelBuilder {
  static getUpdatedExportReadiness({
    previousCsvText = "",
    reviewBridge = null,
    rows = [],
  }) {
    if (!reviewBridge) {
      return "Updated export unavailable in draft fallback mode";
    }

    if (rows.length === 0) {
      return "Updated export needs localization rows";
    }

    if (!rows.some((row) => row.anchor)) {
      return "Updated export needs anchored review rows";
    }

    if (!previousCsvText.trim()) {
      return "Updated export needs previous CSV";
    }

    return "Updated export ready";
  }

  static getDirectReplaceReadiness({
    draftStore,
    previousCsvFileHandle = null,
    previousCsvText = "",
    reviewBridge = null,
    rows = [],
  }) {
    if (!previousCsvFileHandle) {
      return "Replace previous CSV needs a linked previous CSV";
    }

    const updatedReadiness = this.getUpdatedExportReadiness({
      previousCsvText,
      reviewBridge,
      rows,
    });
    if (updatedReadiness !== "Updated export ready") {
      return updatedReadiness;
    }

    if (this.countPersistableDraftOverrides(rows, draftStore) === 0) {
      return "Replace previous CSV has no unsaved drafts";
    }

    return "Replace previous CSV ready";
  }

  static getLinkedPreviousCsvSummary({
    draftStore,
    previousCsvFileHandle = null,
    rows = [],
  }) {
    if (!previousCsvFileHandle) {
      return "";
    }

    const unsavedDraftCount = this.countPersistableDraftOverrides(rows, draftStore);
    if (unsavedDraftCount === 0) {
      return "linked clean";
    }

    return `linked ${unsavedDraftCount} unsaved`;
  }

  static getReplaceSessionSummary({
    draftStore,
    previousCsvFileHandle = null,
    rows = [],
  }) {
    if (!previousCsvFileHandle) {
      return "Replace needs linked baseline";
    }

    const unsavedDraftCount = this.countPersistableDraftOverrides(rows, draftStore);
    if (unsavedDraftCount === 0) {
      return "Linked clean";
    }

    return `Linked ${unsavedDraftCount} unsaved`;
  }

  static countPersistableDraftOverrides(rows, draftStore) {
    let count = 0;
    for (const row of rows || []) {
      if (row.anchor && draftStore.hasDraft(row)) {
        count += 1;
      }
    }

    return count;
  }
}
