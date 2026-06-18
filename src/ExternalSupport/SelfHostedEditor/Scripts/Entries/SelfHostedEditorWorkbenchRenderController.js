import { ProjectWorkspaceDraftSummaryModelBuilder } from "../ProjectWorkspace/Models/ProjectWorkspaceDraftSummaryModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ProjectWorkspaceSessionStatusModelBuilder } from "../ProjectWorkspace/Models/ProjectWorkspaceSessionStatusModelBuilder.js";
import { WorkspaceSummaryHostedModelBuilder } from "../ProjectWorkspace/Models/WorkspaceSummaryHostedModelBuilder.js";
import { RuntimeActionAuthoringModelBuilder } from "../Runtime/Models/RuntimeActionAuthoringModelBuilder.js";
import { RuntimeStatusSurfaceModelBuilder } from "../Runtime/Models/RuntimeStatusSurfaceModelBuilder.js";

export class SelfHostedEditorWorkbenchRenderController {
  constructor({
    diagnosticsBridge,
    diagnosticsController,
    documentOutlineController,
    documentSymbolBridge,
    editorController,
    editorStatusController,
    hostCapabilityCatalogController,
    layoutController,
    lineMapBridge,
    loadingController,
    localizationController,
    localizationDraftStore,
    actionPanelController,
    mockQueryPanelController,
    previewController,
    projectSessionService,
    runtimeBridge,
    runtimeStatusPanelController,
    storyGraphBridge,
    storyGraphController,
    workspaceController,
    workspaceFileListController,
    workspaceSessionController,
    workspaceSummaryController,
  }) {
    this.diagnosticsBridge = diagnosticsBridge;
    this.diagnosticsController = diagnosticsController;
    this.documentOutlineController = documentOutlineController;
    this.documentSymbolBridge = documentSymbolBridge;
    this.editorController = editorController;
    this.editorStatusController = editorStatusController;
    this.hostCapabilityCatalogController = hostCapabilityCatalogController;
    this.layoutController = layoutController;
    this.lineMapBridge = lineMapBridge;
    this.loadingController = loadingController;
    this.localizationController = localizationController;
    this.localizationDraftStore = localizationDraftStore;
    this.actionPanelController = actionPanelController || null;
    this.mockQueryPanelController = mockQueryPanelController || null;
    this.previewController = previewController;
    this.projectSessionService = projectSessionService;
    this.runtimeBridge = runtimeBridge;
    this.runtimeStatusPanelController = runtimeStatusPanelController || null;
    this.storyGraphBridge = storyGraphBridge;
    this.storyGraphController = storyGraphController;
    this.workspaceController = workspaceController;
    this.workspaceFileListController = workspaceFileListController;
    this.workspaceSessionController = workspaceSessionController;
    this.workspaceSummaryController = workspaceSummaryController;
    this.diagnosticsRenderVersion = 0;
    this.latestDiagnosticSnapshot = {
      diagnostics: [],
      provider: "draft-fallback",
    };
    this.latestLineIdentityProvider = null;
    this.latestLocalizationSummary = {
      provider: "unavailable",
      rows: [],
    };
    this.latestRuntimeSnapshot = {
      provider: "unavailable",
      snapshot: null,
    };
    this.latestHostBindingCatalog = null;
    this.latestHostSchemaCatalog = null;
    this.latestStoryGraphModel = null;
    this.latestBackendSessionStatus = {
      mode: "dev-host",
      sessionId: this.projectSessionService?.sessionId || "default",
      workspace: {
        activeRelativePath: "",
        documentCount: 0,
        revision: 1,
        source: "temporary-workspace",
      },
    };
  }

  getLatestDiagnosticSnapshot() {
    return this.latestDiagnosticSnapshot;
  }

  getLatestRuntimeSnapshot() {
    return this.latestRuntimeSnapshot;
  }

  getLatestStoryGraphModel() {
    return this.latestStoryGraphModel;
  }

  setLatestRuntimeSnapshot(runtimeSnapshot) {
    this.latestRuntimeSnapshot = runtimeSnapshot;
    this.renderRuntimeStatusPanel();
  }

  async renderWorkbench(scriptText, activeLineNumber = 1) {
    const renderVersion = ++this.diagnosticsRenderVersion;
    this.loadingController.setManyLoading({
      diagnostics: "Checking problems",
      editor: "Syncing line ids",
      graph: "Mapping story",
      host: "Reading host catalog",
      localization: "Gathering lines",
      runtimeAction: "Preparing action debug",
      outline: "Reading outline",
      preview: "Reading compiler graph",
      runtime: "Starting runtime",
      status: "Refreshing workspace",
      summary: "Counting quietly",
    });
    const lineIdentitySnapshot = await this.lineMapBridge.refreshLineMap(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }

    this.latestLineIdentityProvider = lineIdentitySnapshot.lineMap
      ? ScriptLineIdentityModelBuilder.build(lineIdentitySnapshot.lineMap, this.workspaceController.getState().filePath)
      : null;
    const documentModel = this.editorController.renderAuthoringState(scriptText, this.latestLineIdentityProvider);
    this.loadingController.setIdle("editor");
    await this.localizationController.render(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }

    this.latestLocalizationSummary = this.localizationController.getSummarySnapshot();
    this.loadingController.setIdle("localization");
    const hostCatalogs = await this.hostCapabilityCatalogController.render(scriptText);
    this.latestHostBindingCatalog = hostCatalogs?.hostBindingCatalog || null;
    this.latestHostSchemaCatalog = hostCatalogs?.hostSchemaCatalog || null;
    this.runtimeBridge?.setActionBridgeInput?.(RuntimeActionAuthoringModelBuilder.buildRuntimeActionBridgeInput({
      hostBindingCatalog: this.latestHostBindingCatalog,
      hostSchemaCatalog: this.latestHostSchemaCatalog,
    }));
    this.loadingController.setIdle("host");
    const storyGraphSnapshot = await this.storyGraphBridge.getStoryGraph(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }

    const storyGraphModel = storyGraphSnapshot.graph;
    const runtimeSnapshot = await this.runtimeBridge.getRuntimeSnapshot(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }
    this.latestStoryGraphModel = storyGraphModel;
    this.latestRuntimeSnapshot = runtimeSnapshot;
    this.loadingController.setIdle("runtime");
    this.renderRuntimeStatusPanel();
    this.renderActionPanel();
    this.loadingController.setIdle("runtimeAction");
    this.renderMockQueryPanel();
    this.loadingController.setIdle("mockQuery");

    this.previewController.render(
      scriptText,
      activeLineNumber,
      storyGraphSnapshot.graph,
      this.latestRuntimeSnapshot
    );
    this.storyGraphController.render(storyGraphSnapshot.graph, scriptText);
    this.loadingController.setManyIdle(["preview", "graph"]);
    const diagnosticSnapshot = await this.diagnosticsBridge.getDiagnostics(scriptText);
    this.latestDiagnosticSnapshot = diagnosticSnapshot;
    this.loadingController.setIdle("diagnostics");
    const symbolSnapshot = await this.documentSymbolBridge.getDocumentSymbols(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }
    this.loadingController.setIdle("outline");

    this.diagnosticsController.render(diagnosticSnapshot);
    this.editorController.renderDiagnostics(diagnosticSnapshot);
    this.editorStatusController.setActiveLine(activeLineNumber);
    this.editorStatusController.renderDiagnosticSnapshot(diagnosticSnapshot);
    this.documentOutlineController.render(symbolSnapshot, documentModel);
    this.documentOutlineController.setActiveLine(activeLineNumber);
    this.renderWorkspaceSummary(scriptText, diagnosticSnapshot);
    this.loadingController.setIdle("summary");
    await this.refreshBackendSessionStatus();
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }
    this.loadingController.setIdle("status");
    this.renderWorkspaceSession();
  }

  async refreshBackendSessionStatus() {
    if (typeof this.projectSessionService?.status !== "function") {
      return;
    }

    try {
      this.latestBackendSessionStatus = await this.projectSessionService.status({
        workspace: this.workspaceController.getWorkspaceContext(),
      });
    } catch (error) {
      const workspace = this.workspaceController.getWorkspaceContext();
      this.latestBackendSessionStatus = {
        error: error instanceof Error ? error.message : String(error),
        mode: "dev-host",
        sessionId: this.projectSessionService.sessionId || "default",
        workspace: {
          activeRelativePath: workspace.currentFilePath || "",
          documentCount: Array.isArray(workspace.documents) ? workspace.documents.length : 0,
          revision: workspace.revision || 1,
          source: "request-snapshot",
        },
      };
    }
  }

  renderWorkspaceSummary(scriptText, diagnosticSnapshot = null) {
    const nextDiagnosticSnapshot = diagnosticSnapshot || this.latestDiagnosticSnapshot;
    const hostedSummary = WorkspaceSummaryHostedModelBuilder.build({
      diagnosticSnapshot: nextDiagnosticSnapshot,
      localizationDraftStore: this.localizationDraftStore,
      localizationSummary: this.latestLocalizationSummary,
      runtimeSnapshot: this.latestRuntimeSnapshot,
      storyGraphModel: this.latestStoryGraphModel,
    });
    const summary = hostedSummary || ProjectWorkspaceDraftSummaryModelBuilder.build(
      scriptText,
      this.localizationDraftStore,
      Array.isArray(nextDiagnosticSnapshot?.diagnostics) ? nextDiagnosticSnapshot.diagnostics.length : null
    );

    this.workspaceSummaryController.render(summary);
  }

  renderWorkspaceSession() {
    const workspaceState = this.workspaceController.getState();
    const layoutState = this.layoutController.getState();
    this.workspaceSessionController.render(ProjectWorkspaceSessionStatusModelBuilder.build({
      diagnosticsSnapshot: this.latestDiagnosticSnapshot,
      layoutState,
      projectSession: this.latestBackendSessionStatus,
      runtimeSnapshot: this.latestRuntimeSnapshot,
      workspaceState,
    }));
  }

  renderWorkspaceFiles() {
    this.workspaceFileListController.render(this.workspaceController.getState());
  }

  renderRuntimeStatusPanel() {
    const statusModel = RuntimeStatusSurfaceModelBuilder.build({
      runtimeSnapshot: this.latestRuntimeSnapshot,
      sessionId: this.runtimeBridge?.sessionId || "",
      workspaceRevision: this.workspaceController.getState().revision || null,
    });
    this.runtimeStatusPanelController?.render(statusModel);
    return statusModel;
  }

  renderMockQueryPanel() {
    this.mockQueryPanelController?.render(this.latestHostSchemaCatalog, {
      runtimeSnapshot: this.latestRuntimeSnapshot,
      sessionId: this.runtimeBridge?.sessionId || "",
      workspaceRevision: this.workspaceController.getState().revision || null,
    });
  }

  renderActionPanel() {
    this.actionPanelController?.render(this.latestHostSchemaCatalog, this.latestHostBindingCatalog, {
      runtimeSnapshot: this.latestRuntimeSnapshot,
      sessionId: this.runtimeBridge?.sessionId || "",
      workspaceRevision: this.workspaceController.getState().revision || null,
    });
  }
}
