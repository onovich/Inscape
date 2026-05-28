export class LocalizationDraftStore {
  constructor() {
    this.translationsByKey = new Map();
  }

  getTranslation(item) {
    const key = this.createKey(item);
    return this.translationsByKey.has(key)
      ? this.translationsByKey.get(key) || ""
      : "";
  }

  setTranslation(item, translation) {
    this.translationsByKey.set(this.createKey(item), String(translation ?? ""));
  }

  clearTranslation(item) {
    this.translationsByKey.delete(this.createKey(item));
  }

  hasDraft(item) {
    return this.translationsByKey.has(this.createKey(item));
  }

  getStatus(item) {
    return this.hasDraft(item) ? "draft" : "empty";
  }

  countDraftsForRows(rows) {
    return rows.filter((row) => this.hasDraft(row) && this.getTranslation(row)).length;
  }

  createKey(item) {
    if (item?.anchor) {
      return `anchor:${item.anchor}`;
    }

    return `${item.nodeTitle}:${item.sourceLine}:${item.kind}:${item.text}`;
  }
}
