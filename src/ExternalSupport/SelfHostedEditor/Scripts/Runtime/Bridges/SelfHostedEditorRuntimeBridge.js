import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";
import { EditorBackendWorkspaceRequestModel } from "../../Backend/Models/EditorBackendWorkspaceRequestModel.js";

export class SelfHostedEditorRuntimeBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.runtimeSessionClient = options.runtimeSessionClient
      || services?.runtimeSessionClient
      || createEditorBackendServices(options).runtimeSessionClient;
    this.sessionId = options.sessionId || this.runtimeSessionClient.sessionId || this.createSessionId();
    this.workspaceContextProvider = null;
    this.workspaceSnapshotProvider = null;
    this.actionBridgeInput = null;
    this.mockQueryProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  setWorkspaceSnapshotProvider(provider) {
    this.workspaceSnapshotProvider = provider;
  }

  setMockQueryProvider(queryProvider) {
    this.mockQueryProvider = queryProvider && typeof queryProvider === "object"
      ? queryProvider
      : null;
  }

  clearMockQueryProvider() {
    this.mockQueryProvider = null;
  }

  getMockQueryProvider() {
    return this.mockQueryProvider;
  }

  setActionBridgeInput(actionBridgeInput) {
    this.actionBridgeInput = actionBridgeInput && typeof actionBridgeInput === "object"
      ? actionBridgeInput
      : null;
  }

  clearActionBridgeInput() {
    this.actionBridgeInput = null;
  }

  getActionBridgeInput() {
    return this.actionBridgeInput;
  }

  async getRuntimeSnapshot(scriptText) {
    try {
      const workspace = this.workspaceContextProvider?.() || null;
      const request = this.buildWorkspaceRequest({
        request: this.buildRuntimeRequest({
          sessionId: this.sessionId,
        }),
        scriptText,
        workspace,
      });
      const snapshot = await this.runtimeSessionClient.startOrObserve(request);

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
        snapshot = await this.runtimeSessionClient.step(this.buildWorkspaceRequest({
          request: this.buildRuntimeRequest({
            action,
            sessionId: this.sessionId,
          }),
          scriptText,
          workspace,
        }));
      } catch (error) {
        if (!runtimeState) {
          throw error;
        }

        snapshot = await this.runtimeSessionClient.step(this.buildWorkspaceRequest({
          request: this.buildRuntimeRequest({
            action,
            runtimeState,
            sessionId: this.sessionId,
          }),
          scriptText,
          workspace,
        }));
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

  buildWorkspaceRequest({ request, scriptText, workspace }) {
    return EditorBackendWorkspaceRequestModel.build({
      request,
      scriptText,
      workspace,
      workspaceSnapshot: this.workspaceSnapshotProvider?.() || null,
    });
  }

  buildRuntimeRequest(request) {
    const nextRequest = {
      ...request,
    };
    if (this.mockQueryProvider) {
      nextRequest.queryProvider = this.mockQueryProvider;
    }

    if (this.actionBridgeInput) {
      nextRequest.actionDispatcher = this.actionBridgeInput;
    }

    return nextRequest;
  }
}
