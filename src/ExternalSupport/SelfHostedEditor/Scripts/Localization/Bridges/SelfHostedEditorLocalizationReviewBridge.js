export class SelfHostedEditorLocalizationReviewBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getLocalizationReview(scriptText, previousCsv = "") {
    try {
      const response = await fetch("/api/localization-review", {
        body: JSON.stringify({
          previousCsv,
          scriptText,
          workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Localization review bridge failed with HTTP ${response.status}`);
      }

      const payload = await response.json();
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
      const response = await fetch("/api/localization-update", {
        body: JSON.stringify({
          previousCsv,
          scriptText,
          translationOverrides,
          workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Localization update bridge failed with HTTP ${response.status}`);
      }

      const payload = await response.json();
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
}
