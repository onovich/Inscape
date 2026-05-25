export class SelfHostedEditorRuntimeBridge {
  constructor() {
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getRuntimeSnapshot(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const response = await fetch("/api/runtime-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scriptText,
          workspace,
        }),
      });

      if (!response.ok) {
        throw new Error(`Runtime bridge returned HTTP ${response.status}.`);
      }

      return {
        provider: "runtime-project",
        snapshot: await response.json(),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        provider: "unavailable",
        snapshot: null,
      };
    }
  }
}
