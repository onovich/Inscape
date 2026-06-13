import { ProjectWorkspaceSummaryModelBuilder } from "../ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";

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
    previewController,
    runtimeBridge,
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
    this.previewController = previewController;
    this.runtimeBridge = runtimeBridge;
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
    this.latestRuntimeSnapshot = {
      provider: "unavailable",
      snapshot: null,
    };
  }

  getLatestDiagnosticSnapshot() {
    return this.latestDiagnosticSnapshot;
  }

  getLatestRuntimeSnapshot() {
    return this.latestRuntimeSnapshot;
  }

  setLatestRuntimeSnapshot(runtimeSnapshot) {
    this.latestRuntimeSnapshot = runtimeSnapshot;
  }

  async renderWorkbench(scriptText, activeLineNumber = 1) {
    const renderVersion = ++this.diagnosticsRenderVersion;
    this.loadingController.setManyLoading({
      diagnostics: "Checking problems",
      editor: "Syncing line ids",
      graph: "Mapping story",
      host: "Reading host catalog",
      localization: "Gathering lines",
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
    this.loadingController.setIdle("localization");
    await this.hostCapabilityCatalogController.render(scriptText);
    this.loadingController.setIdle("host");
    const storyGraphSnapshot = await this.storyGraphBridge.getStoryGraph(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }

    this.latestRuntimeSnapshot = await this.runtimeBridge.getRuntimeSnapshot(scriptText);
    if (renderVersion !== this.diagnosticsRenderVersion) {
      return;
    }
    this.loadingController.setIdle("runtime");

    this.previewController.render(
      scriptText,
      activeLineNumber,
      storyGraphSnapshot.graph,
      this.latestRuntimeSnapshot.provider === "runtime-project"
        ? this.latestRuntimeSnapshot.snapshot
        : null
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
    this.renderWorkspaceSummary(scriptText, diagnosticSnapshot.diagnostics.length);
    this.loadingController.setIdle("summary");
    this.loadingController.setIdle("status");
    this.renderWorkspaceSession();
  }

  renderWorkspaceSummary(scriptText, diagnosticsCount) {
    this.workspaceSummaryController.render(
      ProjectWorkspaceSummaryModelBuilder.build(scriptText, this.localizationDraftStore, diagnosticsCount)
    );
  }

  renderWorkspaceSession() {
    const workspaceState = this.workspaceController.getState();
    const layoutState = this.layoutController.getState();
    this.workspaceSessionController.render({
      ...workspaceState,
      ...layoutState,
      diagnosticsLabel: this.latestDiagnosticSnapshot.provider === "language-server"
        ? "LanguageServer"
        : "Draft fallback",
      runtimeLabel: this.latestRuntimeSnapshot.provider === "runtime-project"
        ? (this.latestRuntimeSnapshot.snapshot?.state?.currentNodeName || "started")
        : "unavailable",
    });
  }

  renderWorkspaceFiles() {
    this.workspaceFileListController.render(this.workspaceController.getState());
  }
}
