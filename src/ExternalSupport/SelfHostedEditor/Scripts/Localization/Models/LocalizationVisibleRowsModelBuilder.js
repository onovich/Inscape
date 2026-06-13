const allowedFilterModes = new Set([
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

export class LocalizationVisibleRowsModelBuilder {
  static getVisibleRows(rows, filterMode, draftStore) {
    const normalizedFilterMode = this.normalizeFilterMode(filterMode);
    return (rows || []).filter((row) => this.matchesFilter(row, normalizedFilterMode, draftStore));
  }

  static getVisibleDraftRows(rows, filterMode, draftStore) {
    return this.getVisibleRows(rows, filterMode, draftStore).filter((row) => draftStore.hasDraft(row));
  }

  static matchesFilter(item, filterMode, draftStore) {
    const status = this.getRowStatus(item, draftStore);
    switch (this.normalizeFilterMode(filterMode)) {
      case "actionable":
        return ["draft", "empty", "new", "changed", "conflict", "stale", "removed"].includes(status);
      case "all":
        return true;
      default:
        return status === filterMode;
    }
  }

  static getRowStatus(item, draftStore) {
    if (draftStore.hasDraft(item)) {
      return "draft";
    }

    if (item.reviewStatus) {
      return item.reviewStatus;
    }

    return item.translation ? "review" : "empty";
  }

  static normalizeFilterMode(filterMode) {
    const value = String(filterMode || "").trim().toLowerCase();
    return allowedFilterModes.has(value) ? value : "all";
  }

  static buildFilterLabel(filterMode) {
    switch (this.normalizeFilterMode(filterMode)) {
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

  static getRowKey(item) {
    if (item.anchor) {
      return `anchor:${item.anchor}`;
    }

    return `${item.nodeTitle}:${item.sourceLine}:${item.kind}:${item.text}`;
  }
}
