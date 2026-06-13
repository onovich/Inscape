import { EditorBackendClient } from "../../Backend/Clients/EditorBackendClient.js";

export class SelfHostedEditorStoryNodeMapBridge {
  constructor(options = {}) {
    this.backendClient = options.backendClient || new EditorBackendClient();
    this.workspaceContextProvider = null;
  }

  setWorkspaceContextProvider(provider) {
    this.workspaceContextProvider = provider;
  }

  async reviewNodeMap(scriptText) {
    try {
      const review = await this.backendClient.stableNodeMap.review({
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
      const apply = await this.backendClient.stableNodeMap.applyCandidate({
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
