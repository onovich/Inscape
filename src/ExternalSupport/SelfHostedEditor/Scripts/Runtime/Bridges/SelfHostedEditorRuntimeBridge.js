import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorRuntimeBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.runtimeSessionClient = options.runtimeSessionClient
      || services?.runtimeSessionClient
      || createEditorBackendServices(options).runtimeSessionClient;
    this.sessionId = options.sessionId || this.runtimeSessionClient.sessionId || this.createSessionId();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async getRuntimeSnapshot(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const snapshot = await this.runtimeSessionClient.startOrObserve({
        sessionId: this.sessionId,
        scriptText,
        workspace,
      });

      return {
        provider: "runtime-project",
        snapshot,
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
      let snapshot;
      try {
        snapshot = await this.runtimeSessionClient.step({
          action,
          sessionId: this.sessionId,
          scriptText,
          workspace,
        });
      } catch (error) {
        if (!runtimeState) {
          throw error;
        }

        snapshot = await this.runtimeSessionClient.step({
          action,
          runtimeState,
          sessionId: this.sessionId,
          scriptText,
          workspace,
        });
      }

      return {
        provider: "runtime-project",
        snapshot,
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
