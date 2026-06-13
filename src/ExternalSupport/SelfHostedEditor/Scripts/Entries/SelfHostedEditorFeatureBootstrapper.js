import { EditorBackendClient } from "../Backend/Clients/EditorBackendClient.js";
import { SelfHostedEditorStoryNodeMapBridge } from "../EditorAuthoring/Bridges/SelfHostedEditorStoryNodeMapBridge.js";
import { EditorCompletionController } from "../EditorAuthoring/Controllers/EditorCompletionController.js";
import { EditorDefinitionController } from "../EditorAuthoring/Controllers/EditorDefinitionController.js";
import { EditorDiagnosticsController } from "../EditorAuthoring/Controllers/EditorDiagnosticsController.js";
import { EditorHoverController } from "../EditorAuthoring/Controllers/EditorHoverController.js";
import { EditorReferenceOverlayController } from "../EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { EditorRenameController } from "../EditorAuthoring/Controllers/EditorRenameController.js";
import { EditorStatusController } from "../EditorAuthoring/Controllers/EditorStatusController.js";
import { EditorSurfaceController } from "../EditorAuthoring/Controllers/EditorSurfaceController.js";
import { StoryNodeMapReviewController } from "../EditorAuthoring/Controllers/StoryNodeMapReviewController.js";
import { SelfHostedEditorHostBindingBridge } from "../HostBinding/Bridges/SelfHostedEditorHostBindingBridge.js";
import { SelfHostedEditorHostSchemaBridge } from "../HostSchema/Bridges/SelfHostedEditorHostSchemaBridge.js";
import { HostCapabilityCatalogController } from "../HostSchema/Controllers/HostCapabilityCatalogController.js";
import { SelfHostedEditorCompletionBridge } from "../LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js";
import { SelfHostedEditorDefinitionBridge } from "../LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js";
import { SelfHostedEditorDiagnosticsBridge } from "../LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js";
import { SelfHostedEditorDocumentSymbolBridge } from "../LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js";
import { SelfHostedEditorHoverBridge } from "../LanguageServer/Bridges/SelfHostedEditorHoverBridge.js";
import { SelfHostedEditorLineMapBridge } from "../LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js";
import { SelfHostedEditorReferencesBridge } from "../LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js";
import { SelfHostedEditorStoryGraphBridge } from "../LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js";
import { SelfHostedEditorLocalizationReviewBridge } from "../Localization/Bridges/SelfHostedEditorLocalizationReviewBridge.js";
import { LocalizationEditorController } from "../Localization/Controllers/LocalizationEditorController.js";
import { LocalizationDraftStore } from "../Localization/Models/LocalizationDraftStore.js";
import { PreviewPanelController } from "../Preview/Controllers/PreviewPanelController.js";
import { DocumentOutlineController } from "../ProjectWorkspace/Controllers/DocumentOutlineController.js";
import { ProjectWorkspaceController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceController.js";
import { ProjectWorkspaceFileListController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceFileListController.js";
import { ProjectWorkspaceSessionController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceSessionController.js";
import { ProjectWorkspaceSummaryController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js";
import { SelfHostedEditorRuntimeBridge } from "../Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";
import { StoryGraphPreviewController } from "../StoryGraph/Controllers/StoryGraphPreviewController.js";
import { WorkspaceLoadingStateController } from "../WorkspaceLayout/Controllers/WorkspaceLoadingStateController.js";
import { WorkspaceLayoutController } from "../WorkspaceLayout/Controllers/WorkspaceLayoutController.js";

export async function createSelfHostedEditorFeatures(bindings, callbacks = {}) {
  const layoutController = new WorkspaceLayoutController(bindings.shell);
  const loadingController = new WorkspaceLoadingStateController({
    diagnostics: bindings.diagnosticsElement,
    editor: bindings.editorFrameElement,
    graph: bindings.graphPanelElement,
    host: bindings.hostCapabilityPanelElement,
    localization: bindings.localizationPanelElement,
    outline: bindings.outlinePanelElement,
    preview: bindings.previewElement,
    runtime: bindings.runtimePanelElement,
    shell: bindings.shell,
    status: bindings.workspaceStatusElement,
    summary: bindings.workspaceSummaryElement,
  });
  loadingController.setManyLoading({
    diagnostics: "Listening for problems",
    editor: "Opening editor",
    graph: "Preparing map",
    host: "Preparing host catalog",
    localization: "Preparing table",
    outline: "Preparing outline",
    preview: "Preparing reading pane",
    runtime: "Preparing runtime",
    shell: "Opening workspace",
    status: "Loading sample",
    summary: "Preparing summary",
  });
  const diagnosticsController = new EditorDiagnosticsController(bindings.diagnosticsElement);
  const editorStatusController = new EditorStatusController(bindings.statusBarElement);
  const backendClient = new EditorBackendClient();
  const localizationDraftStore = new LocalizationDraftStore();
  const localizationReviewBridge = new SelfHostedEditorLocalizationReviewBridge({ backendClient });
  const localizationController = new LocalizationEditorController({
    panelElement: bindings.localizationPanelElement,
    draftStore: localizationDraftStore,
    clearVisibleDraftsButtonElement: bindings.clearLocalizationDraftsButtonElement,
    exportDraftButtonElement: bindings.exportLocalizationButtonElement,
    exportUpdatedButtonElement: bindings.exportUpdatedLocalizationButtonElement,
    filterModeElement: bindings.localizationFilterModeElement,
    filterSummaryElement: bindings.localizationFilterSummaryElement,
    openPreviousCsvButtonElement: bindings.localizationPreviousCsvButtonElement,
    previousCsvInputElement: bindings.localizationPreviousCsvInputElement,
    previousCsvStatusElement: bindings.localizationPreviousCsvStatusElement,
    replacePreviousCsvButtonElement: bindings.replacePreviousLocalizationCsvButtonElement,
    sessionStatusElement: bindings.localizationSessionStatusElement,
    reviewBridge: localizationReviewBridge,
  });
  const previewController = new PreviewPanelController(
    bindings.previewElement,
    bindings.previewModeButtonElements,
    bindings.previewModeLabelElement
  );
  const storyGraphController = new StoryGraphPreviewController(bindings.graphPanelElement);
  const editorController = await EditorSurfaceController.create(bindings.editorElement, bindings.hintRailElement);
  editorController.setSemanticHighlightEnabled(bindings.syntaxToggleElement?.getAttribute("aria-pressed") !== "false");

  const documentSymbolBridge = new SelfHostedEditorDocumentSymbolBridge({ backendClient });
  const completionBridge = new SelfHostedEditorCompletionBridge({ backendClient });
  const definitionBridge = new SelfHostedEditorDefinitionBridge({ backendClient });
  const diagnosticsBridge = new SelfHostedEditorDiagnosticsBridge({ backendClient });
  const hoverBridge = new SelfHostedEditorHoverBridge({ backendClient });
  const hostBindingBridge = new SelfHostedEditorHostBindingBridge({ backendClient });
  const hostSchemaBridge = new SelfHostedEditorHostSchemaBridge({ backendClient });
  const lineMapBridge = new SelfHostedEditorLineMapBridge({ backendClient });
  const nodeMapBridge = new SelfHostedEditorStoryNodeMapBridge({ backendClient });
  const referencesBridge = new SelfHostedEditorReferencesBridge({ backendClient });
  const runtimeBridge = new SelfHostedEditorRuntimeBridge({ backendClient });
  const storyGraphBridge = new SelfHostedEditorStoryGraphBridge({ backendClient });
  const workspaceController = new ProjectWorkspaceController({
    fileInputElement: bindings.scriptFileInputElement,
    scriptSourceLabelElement: bindings.scriptSourceLabelElement,
    workspaceStatusElement: bindings.workspaceStatusElement,
  });
  const workspaceContextProvider = () => workspaceController.getWorkspaceContext();
  for (const bridge of [
    completionBridge,
    definitionBridge,
    diagnosticsBridge,
    documentSymbolBridge,
    hoverBridge,
    hostBindingBridge,
    hostSchemaBridge,
    lineMapBridge,
    localizationReviewBridge,
    nodeMapBridge,
    referencesBridge,
    runtimeBridge,
    storyGraphBridge,
  ]) {
    bridge.setWorkspaceContextProvider(workspaceContextProvider);
  }

  const editorCompletionController = new EditorCompletionController(
    editorController.getMonaco(),
    completionBridge,
    hostSchemaBridge,
    hostBindingBridge
  );
  const editorHoverController = new EditorHoverController(
    editorController.getMonaco(),
    editorController.getEditor(),
    hoverBridge,
    hostSchemaBridge,
    hostBindingBridge
  );
  let editorReferenceOverlayController = null;
  const editorDefinitionController = new EditorDefinitionController(
    editorController.getMonaco(),
    editorController.getEditor(),
    definitionBridge,
    referencesBridge,
    async (hoverTarget) => {
      const documentModel = editorController.getDocumentModel();
      const node = (documentModel?.nodes || []).find((candidate) => candidate.title === hoverTarget.name);
      if (node) {
        await editorReferenceOverlayController.openForNode(node);
        return;
      }

      if (hoverTarget.kind === "speaker" || hoverTarget.kind === "host-binding") {
        await editorReferenceOverlayController.openForTarget(hoverTarget);
      }
    },
    (selection) => {
      callbacks.onDefinitionSourceSelection?.(selection);
    },
    hostBindingBridge
  );
  const editorRenameController = new EditorRenameController(
    editorController.getMonaco()
  );
  const storyNodeMapReviewController = new StoryNodeMapReviewController({
    reviewBridge: nodeMapBridge,
    reviewButtonElement: bindings.nodeMapReviewButtonElement,
  });
  const hostCapabilityCatalogController = new HostCapabilityCatalogController({
    hostBindingBridge,
    hostSchemaBridge,
    panelElement: bindings.hostCapabilityPanelElement,
  });
  editorReferenceOverlayController = new EditorReferenceOverlayController(
    bindings.editorFrameElement,
    editorController,
    referencesBridge,
    workspaceContextProvider,
    hostBindingBridge
  );
  const documentOutlineController = new DocumentOutlineController(bindings.outlinePanelElement);
  const workspaceFileListController = new ProjectWorkspaceFileListController(bindings.workspaceFilePanelElement);
  const workspaceSummaryController = new ProjectWorkspaceSummaryController(bindings.workspaceSummaryElement);
  const workspaceSessionController = new ProjectWorkspaceSessionController(
    bindings.sessionPanelElement,
    bindings.runtimePanelElement
  );

  return {
    backendClient,
    diagnosticsBridge,
    diagnosticsController,
    documentOutlineController,
    documentSymbolBridge,
    editorCompletionController,
    editorController,
    editorDefinitionController,
    editorHoverController,
    editorReferenceOverlayController,
    editorRenameController,
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
    storyNodeMapReviewController,
    workspaceController,
    workspaceFileListController,
    workspaceSessionController,
    workspaceSummaryController,
  };
}
