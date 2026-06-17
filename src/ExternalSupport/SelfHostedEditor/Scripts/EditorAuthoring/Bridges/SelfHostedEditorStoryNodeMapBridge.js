import { createEditorBackendServices } from "../../Backend/Clients/EditorBackendServiceRegistry.js";

export class SelfHostedEditorStoryNodeMapBridge {
  constructor(options = {}) {
    const services = options.backendServices || null;
    const createdServices = services || createEditorBackendServices(options);
    this.stableNodeMapClient = options.stableNodeMapClient
      || services?.stableNodeMapClient
      || createdServices.stableNodeMapClient;
    this.workspaceSessionClient = options.workspaceSessionClient
      || services?.workspaceSessionClient
      || createdServices.workspaceSessionClient;
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

  async writeBackNodeMap(applyPayload = {}) {
    if (!applyPayload || applyPayload.dryRun || !applyPayload.result?.writesNodeMap) {
      return {
        provider: "node-map-write-back-unavailable",
        writeBack: {
          appliedToWorkspace: false,
          ok: false,
          reason: "node-map-write-back-not-required",
        },
      };
    }

    const relativePath = applyPayload.nodeMapPath || "";
    if (!relativePath || !applyPayload.nodeMapText) {
      return {
        provider: "node-map-write-back-error",
        writeBack: {
          appliedToWorkspace: false,
          ok: false,
          reason: "node-map-write-back-payload-incomplete",
        },
      };
    }

    try {
      const backup = await this.workspaceSessionClient.writeBackBackup({
        writeRequests: [
          {
            relativePath,
          },
        ],
      });
      if (!backup?.ok || Number(backup.copiedCount || 0) < 1) {
        return {
          provider: "node-map-write-back-error",
          writeBack: {
            appliedToWorkspace: false,
            backup,
            ok: false,
            reason: backup?.reason || backup?.skippedWrites?.[0]?.reason || "node-map-backup-not-created",
          },
        };
      }

      const write = await this.stableNodeMapClient.writeSidecar({
        nodeMapText: applyPayload.nodeMapText,
        relativePath,
      });
      return {
        provider: write?.ok ? "node-map-write-back" : "node-map-write-back-error",
        writeBack: {
          appliedToWorkspace: Boolean(write?.ok),
          backup,
          ok: Boolean(write?.ok),
          reason: write?.reason || "",
          write,
        },
      };
    } catch (error) {
      return {
        provider: "node-map-write-back-error",
        writeBack: {
          appliedToWorkspace: false,
          error: error instanceof Error ? error.message : String(error),
          ok: false,
          reason: "node-map-write-back-failed",
        },
      };
    }
  }
}
