export class SelfHostedEditorRuntimeBridge {
  constructor() {
    this.sessionId = this.createSessionId();
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
          sessionId: this.sessionId,
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

  async stepRuntimeSnapshot(scriptText, runtimeState, action) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      let response = await fetch("/api/runtime-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          sessionId: this.sessionId,
          scriptText,
          workspace,
        }),
      });

      if (!response.ok && runtimeState) {
        response = await fetch("/api/runtime-action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            runtimeState,
            sessionId: this.sessionId,
            scriptText,
            workspace,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Runtime action bridge returned HTTP ${response.status}.`);
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

  createSessionId() {
    const randomPart = Math.random().toString(36).slice(2);
    return `runtime-${Date.now().toString(36)}-${randomPart}`;
  }
}
