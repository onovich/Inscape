export class LocalizationDraftCsvBuilder {
  static build(rows, draftStore) {
    const csvRows = [
      ["status", "node", "line", "kind", "sourceText", "translationDraft"],
      ...rows.map((row) => [
        draftStore.getStatus(row),
        row.nodeTitle,
        String(row.sourceLine),
        row.kind,
        row.speaker ? `${row.speaker}：${row.text}` : row.text,
        draftStore.getTranslation(row),
      ]),
    ];

    return csvRows.map((row) => row.map((cell) => this.escapeCell(cell)).join(",")).join("\n");
  }

  static escapeCell(value) {
    const text = String(value ?? "");
    if (!/[",\r\n]/.test(text)) {
      return text;
    }

    return `"${text.replaceAll('"', '""')}"`;
  }
}

