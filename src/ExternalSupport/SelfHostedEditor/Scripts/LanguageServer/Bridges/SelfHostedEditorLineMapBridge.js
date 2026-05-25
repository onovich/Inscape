export class SelfHostedEditorLineMapBridge {
  constructor() {
    this.currentLineMap = null;
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async refreshLineMap(scriptText) {
    try {
      const response = await fetch("/api/line-map-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          existingLineMap: this.currentLineMap,
          scriptText,
          workspace: this.workspaceContextProvider?.() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Line map bridge returned HTTP ${response.status}.`);
      }

      const payload = await response.json();
      this.currentLineMap = payload.lineMap || this.currentLineMap;
      return {
        lineMap: payload.lineMap || null,
        provider: "tooling-line-map",
        refresh: payload.refresh || null,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        lineMap: null,
        provider: "unavailable",
        refresh: null,
      };
    }
  }
}
