import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorLineMapBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.currentLineMap = null;
    this.sessionId = options.sessionId || this.backendClient.sessionId || "self-hosted-editor-line-map";
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async refreshLineMap(scriptText) {
    try {
      const payload = await this.postLineMapRefresh(scriptText, false);
      this.currentLineMap = payload.lineMap || this.currentLineMap;
      return {
        lineMap: payload.lineMap || null,
        provider: "tooling-line-map",
        refresh: payload.refresh || null,
      };
    } catch (error) {
      if (this.currentLineMap) {
        try {
          const payload = await this.postLineMapRefresh(scriptText, true);
          this.currentLineMap = payload.lineMap || this.currentLineMap;
          return {
            lineMap: payload.lineMap || null,
            provider: "tooling-line-map",
            refresh: payload.refresh || null,
          };
        } catch {
          // Fall through to the unavailable payload below.
        }
      }

      return {
        error: error instanceof Error ? error.message : String(error),
        lineMap: null,
        provider: "unavailable",
        refresh: null,
      };
    }
  }

  async postLineMapRefresh(scriptText, includeExplicitLineMap) {
    const requestPayload = {
      scriptText,
      sessionId: this.sessionId,
      workspace: this.workspaceContextProvider?.() || null,
    };
    if (includeExplicitLineMap && this.currentLineMap) {
      requestPayload.existingLineMap = this.currentLineMap;
    }

    return await this.backendClient.lineIdentitySession.refresh(requestPayload);
  }
}
