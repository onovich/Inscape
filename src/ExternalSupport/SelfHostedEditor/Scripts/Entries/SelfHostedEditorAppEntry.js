import { EditorCompletionController } from "../EditorAuthoring/Controllers/EditorCompletionController.js";
import { EditorDefinitionController } from "../EditorAuthoring/Controllers/EditorDefinitionController.js";
import { EditorDiagnosticsController } from "../EditorAuthoring/Controllers/EditorDiagnosticsController.js";
import { EditorHoverController } from "../EditorAuthoring/Controllers/EditorHoverController.js";
import { EditorReferenceOverlayController } from "../EditorAuthoring/Controllers/EditorReferenceOverlayController.js";
import { EditorRenameController } from "../EditorAuthoring/Controllers/EditorRenameController.js";
import { EditorStatusController } from "../EditorAuthoring/Controllers/EditorStatusController.js";
import { EditorSurfaceController } from "../EditorAuthoring/Controllers/EditorSurfaceController.js";
import { SelfHostedEditorCompletionBridge } from "../LanguageServer/Bridges/SelfHostedEditorCompletionBridge.js";
import { SelfHostedEditorDefinitionBridge } from "../LanguageServer/Bridges/SelfHostedEditorDefinitionBridge.js";
import { SelfHostedEditorDiagnosticsBridge } from "../LanguageServer/Bridges/SelfHostedEditorDiagnosticsBridge.js";
import { SelfHostedEditorHoverBridge } from "../LanguageServer/Bridges/SelfHostedEditorHoverBridge.js";
import { SelfHostedEditorLineMapBridge } from "../LanguageServer/Bridges/SelfHostedEditorLineMapBridge.js";
import { SelfHostedEditorReferencesBridge } from "../LanguageServer/Bridges/SelfHostedEditorReferencesBridge.js";
import { SelfHostedEditorStoryGraphBridge } from "../LanguageServer/Bridges/SelfHostedEditorStoryGraphBridge.js";
import { LocalizationEditorController } from "../Localization/Controllers/LocalizationEditorController.js";
import { LocalizationDraftStore } from "../Localization/Models/LocalizationDraftStore.js";
import { PreviewPanelController } from "../Preview/Controllers/PreviewPanelController.js";
import { DocumentOutlineController } from "../ProjectWorkspace/Controllers/DocumentOutlineController.js";
import { ProjectWorkspaceController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceController.js";
import { ProjectWorkspaceFileListController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceFileListController.js";
import { ProjectWorkspaceSessionController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceSessionController.js";
import { ProjectWorkspaceSummaryController } from "../ProjectWorkspace/Controllers/ProjectWorkspaceSummaryController.js";
import { ProjectWorkspaceSummaryModelBuilder } from "../ProjectWorkspace/Models/ProjectWorkspaceSummaryModelBuilder.js";
import { ScriptLineIdentityModelBuilder } from "../ProjectWorkspace/Models/ScriptLineIdentityModelBuilder.js";
import { ScriptNodeRenamePatchBuilder } from "../ProjectWorkspace/Models/ScriptNodeRenamePatchBuilder.js";
import { SelfHostedEditorRuntimeBridge } from "../Runtime/Bridges/SelfHostedEditorRuntimeBridge.js";
import { SelfHostedEditorDocumentSymbolBridge } from "../LanguageServer/Bridges/SelfHostedEditorDocumentSymbolBridge.js";
import { StoryGraphPreviewController } from "../StoryGraph/Controllers/StoryGraphPreviewController.js";
import { WorkspaceLayoutController } from "../WorkspaceLayout/Controllers/WorkspaceLayoutController.js";

const defaultSamplePath = "samples/court-loop.inscape";

async function main() {
  const shell = document.querySelector(".app-shell");
  const sidebarElement = document.querySelector(".app-sidebar");
  const editorElement = document.querySelector(".script-editor");
  const diagnosticsElement = document.querySelector(".diagnostics-dock");
  const editorFrameElement = document.querySelector(".editor-frame");
  const exportLocalizationButtonElement = document.querySelector(".localization-export-button");
  const hintRailElement = document.querySelector(".hint-rail");
  const graphPanelElement = document.querySelector(".graph-panel");
  const localizationPanelElement = document.querySelector(".localization-panel");
  const outlinePanelElement = document.querySelector(".document-outline-panel");
  const workspaceFilePanelElement = document.querySelector(".workspace-file-panel");
  const scriptFileInputElement = document.querySelector(".script-file-input");
  const scriptSourceLabelElement = document.querySelector(".script-source-label");
  const previewElement = document.querySelector(".story-preview");
  const previewModeButtonElements = document.querySelectorAll("[data-preview-mode]");
  const previewModeLabelElement = document.querySelector("[data-preview-mode-label]");
  const runtimePanelElement = document.querySelector(".workspace-runtime-panel");
  const statusBarElement = document.querySelector(".status-bar");
  const sessionPanelElement = document.querySelector(".workspace-session-panel");
  const syntaxToggleElement = document.querySelector("[data-syntax-toggle]");
  const workspaceSummaryElement = document.querySelector(".workspace-summary");
  const workspaceStatusElement = document.querySelector(".workspace-status");

  const layoutController = new WorkspaceLayoutController(shell);
  setupSidebarPanelToggles(sidebarElement);
  const diagnosticsController = new EditorDiagnosticsController(diagnosticsElement);
  const editorStatusController = new EditorStatusController(statusBarElement);
  const localizationDraftStore = new LocalizationDraftStore();
  const localizationController = new LocalizationEditorController(
    localizationPanelElement,
    localizationDraftStore,
    exportLocalizationButtonElement
  );
  const previewController = new PreviewPanelController(
    previewElement,
    previewModeButtonElements,
    previewModeLabelElement
  );
  const storyGraphController = new StoryGraphPreviewController(graphPanelElement);
  const editorController = await EditorSurfaceController.create(editorElement, hintRailElement);
  editorController.setSemanticHighlightEnabled(syntaxToggleElement?.getAttribute("aria-pressed") !== "false");
  const documentSymbolBridge = new SelfHostedEditorDocumentSymbolBridge();
  const completionBridge = new SelfHostedEditorCompletionBridge();
  const definitionBridge = new SelfHostedEditorDefinitionBridge();
  const diagnosticsBridge = new SelfHostedEditorDiagnosticsBridge();
  const hoverBridge = new SelfHostedEditorHoverBridge();
  const lineMapBridge = new SelfHostedEditorLineMapBridge();
  const referencesBridge = new SelfHostedEditorReferencesBridge();
  const runtimeBridge = new SelfHostedEditorRuntimeBridge();
  const storyGraphBridge = new SelfHostedEditorStoryGraphBridge();
  const workspaceContextProvider = () => workspaceController.getWorkspaceContext();
  completionBridge.setWorkspaceContextProvider(workspaceContextProvider);
  definitionBridge.setWorkspaceContextProvider(workspaceContextProvider);
  diagnosticsBridge.setWorkspaceContextProvider(workspaceContextProvider);
  hoverBridge.setWorkspaceContextProvider(workspaceContextProvider);
  lineMapBridge.setWorkspaceContextProvider(workspaceContextProvider);
  referencesBridge.setWorkspaceContextProvider(workspaceContextProvider);
  runtimeBridge.setWorkspaceContextProvider(workspaceContextProvider);
  storyGraphBridge.setWorkspaceContextProvider(workspaceContextProvider);
  documentSymbolBridge.setWorkspaceContextProvider(workspaceContextProvider);
  const editorCompletionController = new EditorCompletionController(
    editorController.getMonaco(),
    completionBridge
  );
  const editorHoverController = new EditorHoverController(
    editorController.getMonaco(),
    editorController.getEditor(),
    hoverBridge
  );
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
      }
    },
    (selection) => {
      focusSourceSelection(selection);
    }
  );
  const editorRenameController = new EditorRenameController(
    editorController.getMonaco()
  );
  const editorReferenceOverlayController = new EditorReferenceOverlayController(
    editorFrameElement,
    editorController,
    referencesBridge,
    workspaceContextProvider
  );
  const documentOutlineController = new DocumentOutlineController(outlinePanelElement);
  const workspaceFileListController = new ProjectWorkspaceFileListController(workspaceFilePanelElement);
  const workspaceSummaryController = new ProjectWorkspaceSummaryController(workspaceSummaryElement);
  const workspaceSessionController = new ProjectWorkspaceSessionController(
    sessionPanelElement,
    runtimePanelElement
  );
  const workspaceController = new ProjectWorkspaceController({
    fileInputElement: scriptFileInputElement,
    scriptSourceLabelElement,
    workspaceStatusElement,
  });
  let diagnosticsRenderVersion = 0;
  let latestDiagnosticSnapshot = {
    diagnostics: [],
    provider: "draft-fallback",
  };
  let latestLineIdentityProvider = null;
  let latestRuntimeSnapshot = {
    provider: "unavailable",
    snapshot: null,
  };

  const defaultSample = await loadDefaultSampleScript();
  editorController.setText(defaultSample.text);
  workspaceController.setSampleWorkspace(defaultSample.text, defaultSample.relativePath);
  await renderWorkbench(editorController.getText(), editorController.getActiveLineNumber());
  renderWorkspaceFiles();
  renderWorkspaceSession();

  editorController.onTextChanged(async (text) => {
    workspaceController.updateCurrentDraft(text);
    await renderWorkbench(text, editorController.getActiveLineNumber());
    workspaceController.markDirty();
    renderWorkspaceSession();
  });

  editorController.onLineChanged((lineNumber) => {
    previewController.highlightSourceLine(lineNumber);
    diagnosticsController.setActiveLine(lineNumber);
    diagnosticsController.render(latestDiagnosticSnapshot);
    documentOutlineController.setActiveLine(lineNumber);
    editorStatusController.setActiveLine(lineNumber);
  });

  workspaceController.onStateChanged(() => {
    renderWorkspaceFiles();
    renderWorkspaceSession();
  });

  layoutController.onStateChanged(() => {
    renderWorkspaceSession();
    storyGraphController.scheduleEdgeRefresh();
  });

  previewController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
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
    await renderWorkbench(targetDocument.text, 1);
    editorController.focusLine(1);
    layoutController.setView("editor");
    layoutController.ensureEditorVisible();
    renderWorkspaceFiles();
    renderWorkspaceSession();
  });

  localizationController.onSourceLineSelected((lineNumber) => {
    editorController.focusLine(lineNumber);
    layoutController.ensureEditorVisible();
  });

  editorController.onAddBlockRequested(async (node) => {
    const nextText = insertNodeBelow(editorController.getText(), node);
    editorController.applyUserTextEdit(nextText);
    await renderWorkbench(nextText, node.endLine + 2);
    editorController.focusLine(node.endLine + 2);
    workspaceController.markDirty();
    layoutController.ensureEditorVisible();
  });

  editorController.onBlockReorderRequested(async ({ sourceNode, targetNode }) => {
    const patch = moveNodeBefore(editorController.getText(), sourceNode, targetNode);
    if (!patch.changed) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await renderWorkbench(patch.text, patch.focusLineNumber);
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
    renderWorkspaceSummary(editorController.getText());
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

    const patch = retargetGraphEdge(editorController.getText(), sourceLine, targetTitle);
    if (!patch.changed) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await renderWorkbench(patch.text, sourceLine);
    editorController.focusLine(sourceLine);
    workspaceController.markDirty();
  });

  editorReferenceOverlayController.onSourceLineSelected((selection) => {
    focusSourceSelection(selection);
    layoutController.ensureEditorVisible();
  });

  function focusSourceSelection(selection) {
    if (selection.sourcePath && selection.sourcePath !== workspaceController.getState().filePath) {
      const targetDocument = workspaceController.openWorkspaceFile(selection.sourcePath);
      if (targetDocument) {
        editorController.setText(targetDocument.text);
        void renderWorkbench(targetDocument.text, selection.lineNumber);
      }
    }

    editorController.focusLine(selection.lineNumber);
  }

  storyGraphController.onNodeRenameRequested((node) => {
    void renameNode(node);
  });

  async function renameNode(node) {
    const nextTitle = await requestNodeRename(node.title);
    if (!nextTitle) {
      return;
    }

    const patch = ScriptNodeRenamePatchBuilder.build(editorController.getText(), node.title, nextTitle);
    if (patch.changedLineNumbers.length === 0) {
      return;
    }

    editorController.applyUserTextEdit(patch.text);
    await renderWorkbench(patch.text, node.sourceLine);
    editorController.focusLine(node.sourceLine);
    workspaceController.markDirty();
  }

  function requestNodeRename(currentTitle) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "rename-dialog-overlay";

      const dialog = document.createElement("form");
      dialog.className = "rename-dialog";
      dialog.setAttribute("aria-label", "Rename node");

      const heading = document.createElement("div");
      heading.className = "rename-dialog-heading";
      heading.textContent = "Rename node";

      const input = document.createElement("input");
      input.className = "rename-dialog-input";
      input.type = "text";
      input.value = currentTitle;
      input.autocomplete = "off";
      input.spellcheck = false;

      const actions = document.createElement("div");
      actions.className = "rename-dialog-actions";

      const cancelButton = document.createElement("button");
      cancelButton.className = "rename-dialog-button";
      cancelButton.type = "button";
      cancelButton.textContent = "Cancel";

      const confirmButton = document.createElement("button");
      confirmButton.className = "rename-dialog-button rename-dialog-confirm";
      confirmButton.type = "submit";
      confirmButton.textContent = "Rename";

      const close = (value) => {
        overlay.remove();
        resolve(value);
      };

      cancelButton.addEventListener("click", () => close(""));
      overlay.addEventListener("mousedown", (event) => {
        if (event.target === overlay) {
          close("");
        }
      });
      dialog.addEventListener("submit", (event) => {
        event.preventDefault();
        close(input.value.trim());
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close("");
        }
      });

      actions.append(cancelButton, confirmButton);
      dialog.append(heading, input, actions);
      overlay.append(dialog);
      document.body.append(overlay);
      input.focus();
      input.select();
    });
  }

  workspaceController.onScriptLoaded(async (script) => {
    editorController.setText(script.text);
    await renderWorkbench(script.text);
    layoutController.setView("editor");
    layoutController.setLayout("write-preview");
    renderWorkspaceFiles();
    renderWorkspaceSession();
  });

  async function renderWorkbench(scriptText, activeLineNumber = 1) {
    const renderVersion = ++diagnosticsRenderVersion;
    const lineIdentitySnapshot = await lineMapBridge.refreshLineMap(scriptText);
    if (renderVersion !== diagnosticsRenderVersion) {
      return;
    }

    latestLineIdentityProvider = lineIdentitySnapshot.lineMap
      ? ScriptLineIdentityModelBuilder.build(lineIdentitySnapshot.lineMap, workspaceController.getState().filePath)
      : null;
    const documentModel = editorController.renderAuthoringState(scriptText, latestLineIdentityProvider);
    localizationController.render(scriptText);
    const storyGraphSnapshot = await storyGraphBridge.getStoryGraph(scriptText);
    if (renderVersion !== diagnosticsRenderVersion) {
      return;
    }

    latestRuntimeSnapshot = await runtimeBridge.getRuntimeSnapshot(scriptText);
    if (renderVersion !== diagnosticsRenderVersion) {
      return;
    }

    previewController.render(scriptText, activeLineNumber, storyGraphSnapshot.graph);
    storyGraphController.render(storyGraphSnapshot.graph, scriptText);
    const diagnosticSnapshot = await diagnosticsBridge.getDiagnostics(scriptText);
    latestDiagnosticSnapshot = diagnosticSnapshot;
    const symbolSnapshot = await documentSymbolBridge.getDocumentSymbols(scriptText);
    if (renderVersion !== diagnosticsRenderVersion) {
      return;
    }

    diagnosticsController.render(diagnosticSnapshot);
    editorController.renderDiagnostics(diagnosticSnapshot);
    editorStatusController.setActiveLine(activeLineNumber);
    editorStatusController.renderDiagnosticSnapshot(diagnosticSnapshot);
    documentOutlineController.render(symbolSnapshot, documentModel);
    documentOutlineController.setActiveLine(activeLineNumber);
    renderWorkspaceSummary(scriptText, diagnosticSnapshot.diagnostics.length);
    renderWorkspaceSession();
  }

  function insertNodeBelow(scriptText, node) {
    const lines = scriptText.split(/\r?\n/);
    const insertIndex = Math.min(lines.length, node.endLine);
    const nextTitle = createNextUntitledTitle(editorController.getDocumentModel()?.nodes || []);
    const blockLines = ["", `# ${nextTitle}`, ""];
    lines.splice(insertIndex, 0, ...blockLines);
    return lines.join("\n");
  }

  function moveNodeBefore(scriptText, sourceNode, targetNode) {
    if (!sourceNode || !targetNode || sourceNode.sourceLine === targetNode.sourceLine) {
      return {
        changed: false,
        focusLineNumber: sourceNode?.sourceLine || 1,
        text: scriptText,
      };
    }

    const lines = scriptText.split(/\r?\n/);
    const sourceStartIndex = sourceNode.sourceLine - 1;
    const sourceEndIndex = sourceNode.endLine;
    const targetStartIndex = targetNode.sourceLine - 1;
    if (sourceStartIndex < 0 || sourceStartIndex >= lines.length || targetStartIndex < 0 || targetStartIndex >= lines.length) {
      return {
        changed: false,
        focusLineNumber: sourceNode.sourceLine,
        text: scriptText,
      };
    }

    const sourceBlock = lines.slice(sourceStartIndex, sourceEndIndex);
    const remainingLines = [
      ...lines.slice(0, sourceStartIndex),
      ...lines.slice(sourceEndIndex),
    ];
    const adjustedTargetIndex = sourceStartIndex < targetStartIndex
      ? Math.max(0, targetStartIndex - sourceBlock.length)
      : targetStartIndex;
    remainingLines.splice(adjustedTargetIndex, 0, ...sourceBlock);

    return {
      changed: true,
      focusLineNumber: adjustedTargetIndex + 1,
      text: remainingLines.join("\n"),
    };
  }

  function retargetGraphEdge(scriptText, sourceLine, targetTitle) {
    const lines = scriptText.split(/\r?\n/);
    const lineIndex = sourceLine - 1;
    const line = lines[lineIndex] || "";
    if (!line.includes("->")) {
      return {
        changed: false,
        text: scriptText,
      };
    }

    const [beforeArrow] = line.split("->");
    const nextLine = targetTitle
      ? `${beforeArrow.trimEnd()} -> ${targetTitle}`
      : beforeArrow.trimEnd();
    if (nextLine === line) {
      return {
        changed: false,
        text: scriptText,
      };
    }

    lines[lineIndex] = nextLine;
    return {
      changed: true,
      text: lines.join("\n"),
    };
  }

  function createNextUntitledTitle(nodes) {
    const existingTitles = new Set(nodes.map((node) => node.title));
    if (!existingTitles.has("Untitled")) {
      return "Untitled";
    }

    let suffix = 2;
    while (existingTitles.has(`Untitled ${suffix}`)) {
      suffix += 1;
    }

    return `Untitled ${suffix}`;
  }

  function renderWorkspaceSummary(scriptText, diagnosticsCount) {
    workspaceSummaryController.render(
      ProjectWorkspaceSummaryModelBuilder.build(scriptText, localizationDraftStore, diagnosticsCount)
    );
  }

  function renderWorkspaceSession() {
    const workspaceState = workspaceController.getState();
    const layoutState = layoutController.getState();
    workspaceSessionController.render({
      ...workspaceState,
      ...layoutState,
      diagnosticsLabel: latestDiagnosticSnapshot.provider === "language-server"
        ? "LanguageServer"
        : "Draft fallback",
      runtimeLabel: latestRuntimeSnapshot.provider === "runtime-project"
        ? (latestRuntimeSnapshot.snapshot?.state?.currentNodeName || "started")
        : "unavailable",
    });
  }

  function renderWorkspaceFiles() {
    workspaceFileListController.render(workspaceController.getState());
  }

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
  void runtimeBridge;
  void workspaceSessionController;
}

main().catch((error) => {
  console.error(error);
  const workspaceStatusElement = document.querySelector(".workspace-status");
  const editorElement = document.querySelector(".script-editor");
  if (workspaceStatusElement) {
    workspaceStatusElement.textContent = "Default .inscape sample failed to load";
  }

  if (editorElement) {
    editorElement.textContent = error instanceof Error ? error.message : String(error);
  }
});

function setupSidebarPanelToggles(sidebarElement) {
  if (!sidebarElement) {
    return;
  }

  for (const button of sidebarElement.querySelectorAll("[data-sidebar-toggle]")) {
    const panelName = button.dataset.sidebarToggle;
    const panelElement = button.closest("section");
    button.addEventListener("click", () => {
      const isCollapsed = !panelElement.classList.contains("is-collapsed");
      panelElement.classList.toggle("is-collapsed", isCollapsed);
      button.setAttribute("aria-expanded", String(!isCollapsed));
      if (panelName === "files") {
        sidebarElement.dataset.filesCollapsed = String(isCollapsed);
      }

      if (panelName === "outline") {
        sidebarElement.dataset.outlineCollapsed = String(isCollapsed);
      }
    });
  }
}
