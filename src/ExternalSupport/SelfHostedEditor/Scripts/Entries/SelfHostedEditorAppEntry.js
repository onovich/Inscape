import { ScriptBlockEditPatchBuilder } from "../ProjectWorkspace/Models/ScriptBlockEditPatchBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import {
  createSelfHostedEditorDomBindings,
  renderSelfHostedEditorStartupError,
  setupSidebarPanelToggles,
} from "./SelfHostedEditorDomBindings.js";
import { createSelfHostedEditorFeatures } from "./SelfHostedEditorFeatureBootstrapper.js";
import { requestSelfHostedEditorNodeRename } from "./SelfHostedEditorNodeRenameDialog.js";
import { SelfHostedEditorWorkbenchRenderController } from "./SelfHostedEditorWorkbenchRenderController.js";

const defaultSamplePath = "samples/court-loop.inscape";

async function main() {
  const bindings = createSelfHostedEditorDomBindings();
  setupSidebarPanelToggles(bindings.sidebarElement);
  const features = await createSelfHostedEditorFeatures(bindings, {
    onDefinitionSourceSelection: (selection) => {
      focusSourceSelection(selection);
    },
  });
  const {
    diagnosticsController,
    documentOutlineController,
    editorCompletionController,
    editorController,
    editorDefinitionController,
    editorHoverController,
    editorReferenceOverlayController,
    editorRenameController,
    editorStatusController,
    hostCapabilityCatalogController,
    layoutController,
    loadingController,
    localizationController,
    previewController,
    runtimeBridge,
    storyGraphController,
    storyNodeMapReviewController,
    workspaceController,
    workspaceFileListController,
    workspaceSessionController,
  } = features;
  const {
    nodeMapReviewButtonElement,
    syntaxToggleElement,
  } = bindings;
  loadingController.setIdle("editor");
  const workbenchRenderController = new SelfHostedEditorWorkbenchRenderController(features);

  const defaultSample = await loadDefaultSampleScript();
  editorController.setText(defaultSample.text);
  workspaceController.setSampleWorkspace(defaultSample.text, defaultSample.relativePath);
  await workbenchRenderController.renderWorkbench(editorController.getText(), editorController.getActiveLineNumber());
  loadingController.setManyIdle(["shell", "status"]);
  workbenchRenderController.renderWorkspaceFiles();
  workbenchRenderController.renderWorkspaceSession();

  editorController.onTextChanged(async (text) => {
    workspaceController.updateCurrentDraft(text);
    await workbenchRenderController.renderWorkbench(text, editorController.getActiveLineNumber());
    workspaceController.markDirty();
    workbenchRenderController.renderWorkspaceSession();
  });

  editorController.onLineChanged((lineNumber) => {
    const latestDiagnosticSnapshot = workbenchRenderController.getLatestDiagnosticSnapshot();
    previewController.highlightSourceLine(lineNumber);
    diagnosticsController.setActiveLine(lineNumber);
    diagnosticsController.render(latestDiagnosticSnapshot);
    documentOutlineController.setActiveLine(lineNumber);
    editorStatusController.setActiveLine(lineNumber);
  });

  workspaceController.onStateChanged(() => {
    workbenchRenderController.renderWorkspaceFiles();
    workbenchRenderController.renderWorkspaceSession();
  });

  layoutController.onStateChanged(() => {
    workbenchRenderController.renderWorkspaceSession();
    storyGraphController.scheduleEdgeRefresh();
  });

  previewController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
  });

  previewController.onChoiceSelected(async (choice) => {
    const latestRuntimeSnapshot = workbenchRenderController.getLatestRuntimeSnapshot();
    if (latestRuntimeSnapshot.provider !== "runtime-project" || !latestRuntimeSnapshot.snapshot?.currentNode) {
      return false;
    }

    if (choice.nodeTitle !== latestRuntimeSnapshot.snapshot.currentNode.name || !choice.runtimeAction) {
      return false;
    }

    const steppedRuntimeSnapshot = await runtimeBridge.stepRuntimeSnapshot(
      editorController.getText(),
      latestRuntimeSnapshot.snapshot,
      choice.runtimeAction
    );
    if (steppedRuntimeSnapshot.provider !== "runtime-project" || !steppedRuntimeSnapshot.snapshot?.currentNode) {
      console.error(
        "SelfHostedEditor runtime action failed:",
        steppedRuntimeSnapshot.error || "runtime snapshot unavailable"
      );
      return true;
    }

    const previousRuntimeNodeName = latestRuntimeSnapshot.snapshot.currentNode?.name || "";
    workbenchRenderController.setLatestRuntimeSnapshot(steppedRuntimeSnapshot);
    previewController.renderRuntimeSnapshot(steppedRuntimeSnapshot.snapshot);
    const nextRuntimeNodeName = steppedRuntimeSnapshot.snapshot.currentNode?.name || "";
    if (nextRuntimeNodeName !== previousRuntimeNodeName) {
      const focusLineNumber = Number(
        steppedRuntimeSnapshot.snapshot.currentNode?.source?.line
        || steppedRuntimeSnapshot.snapshot.currentNode?.lines?.[0]?.source?.line
        || 0
      );
      if (focusLineNumber > 0) {
        editorController.focusLine(focusLineNumber);
        layoutController.ensureEditorVisible();
      }
    }

    workbenchRenderController.renderWorkspaceSession();
    return true;
  });

  diagnosticsController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
  });

  editorStatusController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
  });

  documentOutlineController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
  });

  hostCapabilityCatalogController.onSourceLineSelected((selection) => {
    focusSourceSelection(selection);
    layoutController.ensureEditorVisible();
  });

  syntaxToggleElement?.addEventListener("click", () => {
    const nextEnabled = syntaxToggleElement.getAttribute("aria-pressed") !== "true";
    syntaxToggleElement.setAttribute("aria-pressed", String(nextEnabled));
    editorController.setSemanticHighlightEnabled(nextEnabled);
  });

  workspaceFileListController.onSourceFileSelected(async (filePath) => {
    const targetDocument = workspaceController.openWorkspaceFile(filePath);
    if (!targetDocument) {
      return;
    }

    editorController.setText(targetDocument.text);
    await workbenchRenderController.renderWorkbench(targetDocument.text, 1);
    editorController.focusLine(1);
    layoutController.setView("editor");
    layoutController.ensureEditorVisible();
    workbenchRenderController.renderWorkspaceFiles();
    workbenchRenderController.renderWorkspaceSession();
  });

  localizationController.onSourceLineSelected((selection) => {
    if (typeof selection === "number") {
      editorController.focusLine(selection);
      layoutController.ensureEditorVisible();
      return;
    }

    focusSourceSelection(selection);
    layoutController.ensureEditorVisible();
  });

  editorController.onAddBlockRequested(async (node) => {
    const nextText = ScriptBlockEditPatchBuilder.insertNodeBelow(
      editorController.getText(),
      node,
      editorController.getDocumentModel()?.nodes || []
    );
    editorController.applyUserTextEdit(nextText);
    await workbenchRenderController.renderWorkbench(nextText, node.endLine + 2);
    editorController.focusLine(node.endLine + 2);
    workspaceController.markDirty();
    layoutController.ensureEditorVisible();
  });

  editorController.onBlockReorderRequested(async ({ sourceNode, targetNode }) => {
    const patch = ScriptBlockEditPatchBuilder.moveNodeBefore(editorController.getText(), sourceNode, targetNode);
    if (!patch.changed) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await workbenchRenderController.renderWorkbench(patch.text, patch.focusLineNumber);
    editorController.focusLine(patch.focusLineNumber);
    workspaceController.markDirty();
    layoutController.ensureEditorVisible();
  });

  editorController.onBlockRenameRequested((node) => {
    void renameNode(node);
  });

  editorController.onReferenceListRequested(async (node, anchorRect) => {
    await editorReferenceOverlayController.openForNode(node, anchorRect);
  });

  localizationController.onTranslationChanged(() => {
    workbenchRenderController.renderWorkspaceSummary(editorController.getText());
    workspaceController.markDirty();
  });

  storyGraphController.onSourceLineSelected((selection) => {
    focusSourceSelection(selection);
  });

  storyGraphController.onEdgeRetargetRequested(async ({ sourceLine, sourcePath, targetTitle }) => {
    const workspaceState = workspaceController.getState();
    if (sourcePath && sourcePath !== workspaceState.filePath) {
      const targetDocument = workspaceController.openWorkspaceFile(sourcePath);
      if (targetDocument) {
        editorController.setText(targetDocument.text);
      }
    }

    const patch = ScriptBlockEditPatchBuilder.retargetGraphEdge(editorController.getText(), sourceLine, targetTitle);
    if (!patch.changed) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await workbenchRenderController.renderWorkbench(patch.text, sourceLine);
    editorController.focusLine(sourceLine);
    workspaceController.markDirty();
  });

  editorReferenceOverlayController.onSourceLineSelected((selection) => {
    focusSourceSelection(selection);
    layoutController.ensureEditorVisible();
  });

  storyNodeMapReviewController.onSourceLineSelected((selection) => {
    focusSourceSelection(selection);
    layoutController.ensureEditorVisible();
  });

  nodeMapReviewButtonElement?.addEventListener("click", () => {
    void storyNodeMapReviewController.review(editorController.getText());
  });

  function focusSourceSelection(selection) {
    if (selection.sourcePath && selection.sourcePath !== workspaceController.getState().filePath) {
      const targetDocument = workspaceController.openWorkspaceFile(selection.sourcePath);
      if (targetDocument) {
        editorController.setText(targetDocument.text);
        void workbenchRenderController.renderWorkbench(targetDocument.text, selection.lineNumber);
      }
    }

    editorController.focusLine(selection.lineNumber);
  }

  storyGraphController.onNodeRenameRequested((node) => {
    void renameNode(node);
  });

  async function renameNode(node) {
    const nextTitle = await requestSelfHostedEditorNodeRename(node.title);
    if (!nextTitle) {
      return;
    }

    const patch = ScriptNodeRenamePatchBuilder.build(editorController.getText(), node.title, nextTitle);
    if (patch.changedLineNumbers.length === 0) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await workbenchRenderController.renderWorkbench(patch.text, node.sourceLine);
    editorController.focusLine(node.sourceLine);
    workspaceController.markDirty();
  }

  workspaceController.onScriptLoaded(async (script) => {
    editorController.setText(script.text);
    await workbenchRenderController.renderWorkbench(script.text);
    layoutController.setView("editor");
    layoutController.setLayout("write-preview");
    workbenchRenderController.renderWorkspaceFiles();
    workbenchRenderController.renderWorkspaceSession();
  });

  async function loadDefaultSampleScript() {
    const response = await fetch(`/${defaultSamplePath}`);
    if (!response.ok) {
      throw new Error(`Failed to load default .inscape sample: ${defaultSamplePath}`);
    }

    return {
      relativePath: defaultSamplePath,
      text: await response.text(),
    };
  }

  void editorCompletionController;
  void editorHoverController;
  void editorDefinitionController;
  void editorRenameController;
  void editorReferenceOverlayController;
  void editorStatusController;
  void hostCapabilityCatalogController;
  void storyNodeMapReviewController;
  void runtimeBridge;
  void workspaceSessionController;
}

main().catch((error) => {
  console.error(error);
  renderSelfHostedEditorStartupError(error);
});
