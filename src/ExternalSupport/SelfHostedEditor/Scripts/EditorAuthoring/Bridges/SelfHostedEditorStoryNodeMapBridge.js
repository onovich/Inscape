export class SelfHostedEditorStoryNodeMapBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async reviewNodeMap(scriptText) {
    try {
      const response = await fetch("/api/node-map-review", {
        body: JSON.stringify({
          scriptText,
          workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Stable node map bridge failed with HTTP ${response.status}`);
      }

      return {
        provider: "node-map-review",
        review: await response.json(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        provider: "node-map-review-error",
        review: null,
      };
    }
  }
}
