export class LocalizationCsvFileController {
  constructor({
    draftStore,
    getLastScriptText,
    getRows,
    getUpdatedExportReadiness,
    onLinkedCsvReplaced,
    onPreviousCsvChanged,
    previousCsvInputElement = null,
    reviewBridge = null,
  }) {
    this.draftStore = draftStore;
    this.getLastScriptText = getLastScriptText;
    this.getRows = getRows;
    this.getUpdatedExportReadiness = getUpdatedExportReadiness;
    this.onLinkedCsvReplaced = onLinkedCsvReplaced;
    this.onPreviousCsvChanged = onPreviousCsvChanged;
    this.previousCsvInputElement = previousCsvInputElement;
    this.reviewBridge = reviewBridge;
    this.previousCsvFileHandle = null;
    this.previousCsvName = "";
    this.previousCsvText = "";
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
    await this.onPreviousCsvChanged();
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

  collectTranslationOverrides() {
    return this.getRows()
      .filter((row) => row.anchor && this.draftStore.hasDraft(row))
      .map((row) => ({
        anchor: row.anchor,
        translation: this.draftStore.getTranslation(row),
      }));
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
      const rows = this.getRows();
      this.draftStore.clearDraftsForRows(rows.filter((row) => row.anchor && this.draftStore.hasDraft(row)));
      await this.onLinkedCsvReplaced();
    } catch (error) {
      console.error("SelfHostedEditor previous CSV replace failed:", error);
    }
  }

  async getUpdatedCsvPayload() {
    const lastScriptText = this.getLastScriptText();
    const readiness = this.getUpdatedExportReadiness();
    if (readiness !== "Updated export ready" || !lastScriptText) {
      return {
        csv: "",
        error: lastScriptText ? readiness : "Updated export needs script text",
        provider: "localization-update-unavailable",
      };
    }

    return this.reviewBridge.exportUpdatedLocalizationCsv(
      lastScriptText,
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

  supportsNativeFileHandles() {
    return typeof globalThis.window?.showOpenFilePicker === "function";
  }
}
