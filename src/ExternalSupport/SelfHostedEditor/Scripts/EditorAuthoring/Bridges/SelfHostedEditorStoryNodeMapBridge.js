import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorStoryNodeMapBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    this.stableNodeMapClient = options.stableNodeMapClient
      || services?.stableNodeMapClient
      || createEditorBackendServices(options).stableNodeMapClient;
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async reviewNodeMap(scriptText) {
    try {
      const review = await this.stableNodeMapClient.review({
        scriptText,
        workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
      });

      return {
        provider: "node-map-review",
        review,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        provider: "node-map-review-error",
        review: null,
      };
    }
  }

  async previewCandidateApply(scriptText, item, candidate, nodeMapPath = "") {
    return this.applyCandidate(scriptText, item, candidate, true, nodeMapPath);
  }

  async applyCandidate(scriptText, item, candidate, dryRun = false, nodeMapPath = "") {
    try {
      const apply = await this.stableNodeMapClient.applyCandidate({
        candidate,
        dryRun,
        item,
        nodeMapPath,
        scriptText,
        workspace: this.workspaceContextProvider ? this.workspaceContextProvider() : null,
      });

      return {
        apply,
        provider: "node-map-apply",
      };
    } catch (error) {
      return {
        apply: null,
        error: error instanceof Error ? error.message : String(error),
        provider: "node-map-apply-error",
      };
    }
  }
}
