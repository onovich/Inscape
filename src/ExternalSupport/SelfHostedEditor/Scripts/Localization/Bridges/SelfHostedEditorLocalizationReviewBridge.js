export class SelfHostedEditorLocalizationReviewBridge {
  constructor() {
    this.lastSentPreviousCsv = "";
    this.sessionId = "self-hosted-editor-localization";
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getLocalizationReview(scriptText, previousCsv = "") {
    try {
      const payload = await this.postLocalizationReview(scriptText, previousCsv, this.shouldSendPreviousCsv(previousCsv));
      if (payload?.baseline?.source === "current-extract" && this.lastSentPreviousCsv) {
        const retryPayload = await this.postLocalizationReview(scriptText, previousCsv, true);
        return {
          provider: "localization-review",
          review: retryPayload,
        };
      }

      this.rememberSentPreviousCsv(previousCsv);
      return {
        provider: "localization-review",
        review: payload,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        provider: "draft-fallback",
        review: null,
      };
    }
  }

  async exportUpdatedLocalizationCsv(scriptText, previousCsv, translationOverrides = []) {
    try {
      let payload;
      try {
        payload = await this.postLocalizationUpdate(
          scriptText,
          previousCsv,
          translationOverrides,
          this.shouldSendPreviousCsv(previousCsv)
        );
      } catch (error) {
        if (!String(previousCsv || "").trim()) {
          throw error;
        }

        payload = await this.postLocalizationUpdate(scriptText, previousCsv, translationOverrides, true);
      }

      this.rememberSentPreviousCsv(previousCsv);
      return {
        csv: typeof payload?.csv === "string" ? payload.csv : "",
        error: "",
        format: payload?.format || "",
        formatVersion: Number(payload?.formatVersion || 0),
        provider: "localization-update",
      };
    } catch (error) {
      return {
        csv: "",
        error: error instanceof Error ? error.message : String(error),
        format: "",
        formatVersion: 0,
        provider: "localization-update-error",
      };
    }
  }

  shouldSendPreviousCsv(previousCsv) {
    const csv = String(previousCsv || "");
    return Boolean(csv.trim()) && csv !== this.lastSentPreviousCsv;
  }

  rememberSentPreviousCsv(previousCsv) {
    const csv = String(previousCsv || "");
    if (csv.trim()) {
      this.lastSentPreviousCsv = csv;
    }
  }

  async postLocalizationReview(scriptText, previousCsv, includePreviousCsv) {
    const response = await fetch("/api/localization-review", {
      body: JSON.stringify(this.createRequestPayload(scriptText, previousCsv, includePreviousCsv)),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Localization review bridge failed with HTTP ${response.status}`);
    }

    return response.json();
  }

  async postLocalizationUpdate(scriptText, previousCsv, translationOverrides, includePreviousCsv) {
    const requestPayload = this.createRequestPayload(scriptText, previousCsv, includePreviousCsv);
    requestPayload.translationOverrides = translationOverrides;

    const response = await fetch("/api/localization-update", {
      body: JSON.stringify(requestPayload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Localization update bridge failed with HTTP ${response.status}`);
    }

    return response.json();
  }

  createRequestPayload(scriptText, previousCsv, includePreviousCsv) {
    const payload = {
      scriptText,
      sessionId: this.sessionId,
      workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
    };
    if (includePreviousCsv) {
      payload.previousCsv = previousCsv;
    }

    return payload;
  }
}
