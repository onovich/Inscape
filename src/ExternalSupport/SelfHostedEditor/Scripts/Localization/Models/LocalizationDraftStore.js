export class LocalizationDraftStore {
  constructor() {
    this.translationsByKey = new Map();
  }

  getTranslation(item) {
    return this.translationsByKey.get(this.createKey(item)) || "";
  }

  setTranslation(item, translation) {
    const key = this.createKey(item);
    if (translation) {
      this.translationsByKey.set(key, translation);
    } else {
      this.translationsByKey.delete(key);
    }
  }

  getStatus(item) {
    return this.getTranslation(item) ? "draft" : "empty";
  }

  countDraftsForRows(rows) {
    return rows.filter((row) => this.getTranslation(row)).length;
  }

  createKey(item) {
    return `${item.nodeTitle}:${item.sourceLine}:${item.kind}:${item.text}`;
  }
}
