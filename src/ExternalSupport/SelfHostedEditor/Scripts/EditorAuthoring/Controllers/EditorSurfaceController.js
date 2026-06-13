import { MonacoEditorBridge } from "../Bridges/MonacoEditorBridge.js";
import { EditorLineHintController } from "./EditorLineHintController.js";
import { EditorSemanticDecorationController } from "./EditorSemanticDecorationController.js";
import {
  ScriptDocumentFallbackPolicy,
  ScriptDocumentFallbackReason,
} from "../../ProjectWorkspace/Models/ScriptDocumentFallbackPolicy.js";

export class EditorSurfaceController {
  static async create(editorElement, hintRailElement) {
    const monaco = await MonacoEditorBridge.load();
    return new EditorSurfaceController(editorElement, hintRailElement, monaco);
  }

  constructor(editorElement, hintRailElement, monaco) {
    this.editorElement = editorElement;
    this.hintRailElement = hintRailElement;
    this.monaco = monaco;
    this.markerOwner = "inscape-diagnostics";
    this.addBlockRequestedHandlers = [];
    this.blockReorderRequestedHandlers = [];
    this.blockRenameRequestedHandlers = [];
    this.referenceListRequestedHandlers = [];
    this.currentDocumentModel = null;
    this.textChangedHandlers = [];
    this.lineChangedHandlers = [];
    this.activeLineNumber = 1;
    this.hoveredLineNumber = 0;
    this.isApplyingText = false;

    this.monaco.editor.defineTheme("inscape-workbench", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#00000000",
        "editorGutter.background": "#00000000",
        "editorLineNumber.foreground": "#00000000",
        "editorLineNumber.activeForeground": "#00000000",
        "editorIndentGuide.background1": "#00000000",
        "editorIndentGuide.activeBackground1": "#00000000",
        "editorCursor.foreground": "#686155",
        "editor.selectionBackground": "#dad6cc4a",
        "editor.inactiveSelectionBackground": "#dad6cc24",
        "editor.lineHighlightBackground": "#00000000",
        "editor.lineHighlightBorder": "#00000000",
        "editor.hoverHighlightBackground": "#6a6d570e",
        "editor.rangeHighlightBackground": "#6a6d570d",
        "editor.rangeHighlightBorder": "#00000000",
        "editor.selectionHighlightBackground": "#00000000",
        "editor.selectionHighlightBorder": "#00000000",
        "editor.wordHighlightBackground": "#6a6d570c",
        "editor.wordHighlightBorder": "#00000000",
        "editor.wordHighlightStrongBackground": "#6a6d5712",
        "editor.wordHighlightStrongBorder": "#00000000",
        "editorLink.activeForeground": "#5f654f",
      },
    });

    this.editor = this.monaco.editor.create(this.editorElement, {
      automaticLayout: true,
      fontFamily: "\"Inter\", \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
      fontLigatures: false,
      fontSize: 20,
      glyphMargin: false,
      language: "inscape",
      lineDecorationsWidth: 0,
      lineHeight: 36,
      lineNumbers: "off",
      lineNumbersMinChars: 0,
      minimap: {
        enabled: false,
      },
      model: this.monaco.editor.createModel("", "inscape"),
      occurrencesHighlight: "off",
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      padding: {
        top: 88,
        bottom: 112,
      },
      gotoLocation: {
        multipleDeclarations: "goto",
        multipleDefinitions: "goto",
        multipleImplementations: "goto",
        multipleReferences: "goto",
        multipleTypeDefinitions: "goto",
      },
      hideCursorInOverviewRuler: true,
      renderFinalNewline: "off",
      renderLineHighlight: "none",
      roundedSelection: false,
      selectionHighlight: false,
      scrollBeyondLastLine: false,
      scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontal: "hidden",
        horizontalScrollbarSize: 0,
        verticalScrollbarSize: 8,
      },
      stickyScroll: {
        enabled: false,
      },
      theme: "inscape-workbench",
      unicodeHighlight: {
        ambiguousCharacters: false,
        invisibleCharacters: false,
        nonBasicASCII: false,
      },
      wordWrap: "on",
      wrappingIndent: "same",
    });
    this.lineHintController = new EditorLineHintController({
      editor: this.editor,
      hintRailElement: this.hintRailElement,
      monaco: this.monaco,
      onAddBlockRequested: (lineNumber) => this.notifyAddBlockRequested(lineNumber),
      onBlockRenameRequested: (lineNumber) => this.notifyBlockRenameRequested(lineNumber),
      onBlockReorderRequested: (sourceLineNumber, targetLineNumber) =>
        this.notifyBlockReorderRequested(sourceLineNumber, targetLineNumber),
      onReferenceListRequested: (node, anchorRect) => this.notifyReferenceListRequested(node, anchorRect),
    });
    this.semanticDecorationController = new EditorSemanticDecorationController({
      editor: this.editor,
      monaco: this.monaco,
    });

    this.editor.onDidChangeModelContent(() => {
      if (this.isApplyingText) {
        return;
      }

      this.notifyTextChanged();
      this.updateActiveLine();
    });

    this.editor.onDidChangeCursorPosition(() => {
      this.updateActiveLine();
    });

    this.editor.onDidScrollChange(() => {
      this.syncHintRailScroll();
    });

    this.editor.onDidContentSizeChange(() => {
      this.renderHints();
    });

    this.editor.onMouseMove((event) => {
      const nextLineNumber = event.target?.position?.lineNumber || 0;
      if (nextLineNumber === this.hoveredLineNumber) {
        return;
      }

      this.hoveredLineNumber = nextLineNumber;
      this.renderHints();
    });

    this.editor.onMouseLeave(() => {
      if (this.hoveredLineNumber === 0) {
        return;
      }

      this.hoveredLineNumber = 0;
      this.renderHints();
    });
  }

  getMonaco() {
    return this.monaco;
  }

  getEditor() {
    return this.editor;
  }

  getDocumentModel() {
    return this.currentDocumentModel;
  }

  setText(text) {
    if (this.getText() === text) {
      return;
    }

    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    this.isApplyingText = true;
    model.setValue(text);
    this.isApplyingText = false;
    this.activeLineNumber = 1;
  }

  applyUserTextEdit(text) {
    if (this.getText() === text) {
      return false;
    }

    const model = this.editor.getModel();
    if (!model) {
      return false;
    }

    this.editor.pushUndoStop();
    this.editor.executeEdits("inscape-user-edit", [
      {
        range: model.getFullModelRange(),
        text,
      },
    ]);
    this.editor.pushUndoStop();
    return true;
  }

  getText() {
    return this.editor.getValue();
  }

  getActiveLineNumber() {
    return this.activeLineNumber;
  }

  onTextChanged(handler) {
    this.textChangedHandlers.push(handler);
  }

  onLineChanged(handler) {
    this.lineChangedHandlers.push(handler);
  }

  onAddBlockRequested(handler) {
    this.addBlockRequestedHandlers.push(handler);
  }

  setSemanticHighlightEnabled(isEnabled) {
    this.semanticDecorationController.setEnabled(isEnabled);
    this.renderSemanticDecorations();
    this.renderActiveBlockDecorations();
  }

  onBlockReorderRequested(handler) {
    this.blockReorderRequestedHandlers.push(handler);
  }

  onBlockRenameRequested(handler) {
    this.blockRenameRequestedHandlers.push(handler);
  }

  onReferenceListRequested(handler) {
    this.referenceListRequestedHandlers.push(handler);
  }

  renderAuthoringState(scriptText, lineIdentityProvider = null) {
    this.currentDocumentModel = ScriptDocumentFallbackPolicy.buildDocumentModel(scriptText, {
      lineIdentityProvider,
      reason: ScriptDocumentFallbackReason.EditorAuthoringSurface,
    });
    this.renderHints();
    this.renderSemanticDecorations();
    this.renderActiveBlockDecorations();
    return this.currentDocumentModel;
  }

  renderHints() {
    this.lineHintController.render(this.currentDocumentModel, this.activeLineNumber, this.hoveredLineNumber);
  }

  syncHintRailScroll() {
    this.lineHintController.syncScroll();
  }

  renderDiagnostics(diagnosticSnapshot) {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    const diagnostics = diagnosticSnapshot?.diagnostics || [];
    const markers = diagnostics.map((diagnostic) => ({
      code: diagnostic.code || "",
      endColumn: Math.max(diagnostic.endColumn || diagnostic.startColumn || 2, 2),
      endLineNumber: diagnostic.sourceLine || 1,
      message: diagnostic.message || "Unknown diagnostic.",
      severity: this.mapMarkerSeverity(diagnostic.severity),
      startColumn: Math.max(diagnostic.startColumn || 1, 1),
      startLineNumber: diagnostic.sourceLine || 1,
    }));

    this.monaco.editor.setModelMarkers(model, this.markerOwner, markers);
  }

  focusLine(lineNumber) {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }

    const boundedLineNumber = Math.max(1, Math.min(lineNumber, model.getLineCount()));

    this.editor.focus();
    this.editor.setPosition({
      lineNumber: boundedLineNumber,
      column: 1,
    });
    this.editor.revealLineInCenter(boundedLineNumber);
    this.activeLineNumber = boundedLineNumber;
    this.renderHints();
    this.renderActiveBlockDecorations();
    this.notifyLineChanged();
  }

  updateActiveLine() {
    const nextLineNumber = this.editor.getPosition()?.lineNumber || 1;
    if (nextLineNumber === this.activeLineNumber) {
      return;
    }

    this.activeLineNumber = nextLineNumber;
    this.renderHints();
    this.renderActiveBlockDecorations();
    this.notifyLineChanged();
  }

  notifyTextChanged() {
    const text = this.getText();
    for (const handler of this.textChangedHandlers) {
      handler(text);
    }
  }

  notifyLineChanged() {
    for (const handler of this.lineChangedHandlers) {
      handler(this.activeLineNumber);
    }
  }

  notifyAddBlockRequested(lineNumber) {
    const node = (this.currentDocumentModel?.nodes || []).find((item) => item.sourceLine === lineNumber);
    if (!node) {
      return;
    }

    for (const handler of this.addBlockRequestedHandlers) {
      handler(node);
    }
  }

  notifyReferenceListRequested(node, anchorRect = null) {
    for (const handler of this.referenceListRequestedHandlers) {
      handler(node, anchorRect);
    }
  }

  notifyBlockReorderRequested(sourceLineNumber, targetLineNumber) {
    if (!sourceLineNumber || !targetLineNumber || sourceLineNumber === targetLineNumber) {
      return;
    }

    const nodes = this.currentDocumentModel?.nodes || [];
    const sourceNode = nodes.find((item) => item.sourceLine === sourceLineNumber);
    const targetNode = nodes.find((item) => item.sourceLine === targetLineNumber);
    if (!sourceNode || !targetNode) {
      return;
    }

    for (const handler of this.blockReorderRequestedHandlers) {
      handler({
        sourceNode,
        targetNode,
      });
    }
  }

  notifyBlockRenameRequested(lineNumber) {
    const node = (this.currentDocumentModel?.nodes || []).find((item) => item.sourceLine === lineNumber);
    if (!node) {
      return;
    }

    for (const handler of this.blockRenameRequestedHandlers) {
      handler(node);
    }
  }

  renderSemanticDecorations() {
    this.semanticDecorationController.renderSemanticDecorations(this.currentDocumentModel);
  }

  renderActiveBlockDecorations() {
    this.semanticDecorationController.renderActiveBlockDecorations(this.currentDocumentModel, this.activeLineNumber);
  }

  mapMarkerSeverity(severity) {
    if (severity === "warning") {
      return this.monaco.MarkerSeverity.Warning;
    }

    if (severity === "info") {
      return this.monaco.MarkerSeverity.Info;
    }

    return this.monaco.MarkerSeverity.Error;
  }
}
