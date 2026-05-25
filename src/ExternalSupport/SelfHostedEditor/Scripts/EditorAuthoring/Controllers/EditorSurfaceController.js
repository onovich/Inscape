import { MonacoEditorBridge } from "../Bridges/MonacoEditorBridge.js";
import { ScriptDocumentModelBuilder } from "../../ProjectWorkspace/Models/ScriptDocumentModelBuilder.js";

export class EditorSurfaceController {
  static async create(editorElement, hintRailElement) {
    const monaco = await MonacoEditorBridge.load();
    return new EditorSurfaceController(editorElement, hintRailElement, monaco);
  }

  constructor(editorElement, hintRailElement, monaco) {
    this.editorElement = editorElement;
    this.hintRailElement = hintRailElement;
    this.hintRailContentElement = null;
    this.monaco = monaco;
    this.markerOwner = "inscape-diagnostics";
    this.addBlockRequestedHandlers = [];
    this.blockReorderRequestedHandlers = [];
    this.blockRenameRequestedHandlers = [];
    this.referenceListRequestedHandlers = [];
    this.currentDocumentModel = null;
    this.semanticDecorationIds = [];
    this.activeBlockDecorationIds = [];
    this.semanticHighlightEnabled = true;
    this.textChangedHandlers = [];
    this.lineChangedHandlers = [];
    this.activeLineNumber = 1;
    this.hoveredLineNumber = 0;
    this.draggedNodeSourceLine = 0;
    this.pointerDraggedNodeSourceLine = 0;
    this.pointerDragDropTarget = null;
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
    this.semanticHighlightEnabled = Boolean(isEnabled);
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
    this.currentDocumentModel = ScriptDocumentModelBuilder.build(scriptText, lineIdentityProvider);
    this.renderHints();
    this.renderSemanticDecorations();
    this.renderActiveBlockDecorations();
    return this.currentDocumentModel;
  }

  renderHints() {
    const lineCount = this.editor.getModel()?.getLineCount() || 0;
    const editorOption = this.monaco.editor.EditorOption || {};
    const lineHeight = editorOption.lineHeight ? this.editor.getOption(editorOption.lineHeight) : 36;
    const lineHintsByLine = new Map((this.currentDocumentModel?.lineHints || []).map((lineHint) => [lineHint.sourceLine, lineHint]));
    const nodesByLine = new Map((this.currentDocumentModel?.nodes || []).map((node) => [node.sourceLine, node]));
    const content = document.createElement("div");
    content.className = "hint-rail-content";
    content.style.height = `${this.editor.getContentHeight()}px`;
    content.append(
      ...Array.from({ length: lineCount }, (_, index) => {
        const lineNumber = index + 1;
        const lineHint = lineHintsByLine.get(lineNumber);
        const isTitleLine = lineHint?.kind === "title";
        const hint = document.createElement("div");
        hint.className = "hint-line";
        hint.style.height = `${lineHeight}px`;
        hint.style.top = `${this.editor.getTopForLineNumber(lineNumber)}px`;
        if (isTitleLine) {
          hint.classList.add("is-title");
        }

        if (lineNumber === this.activeLineNumber) {
          hint.classList.add("is-active");
        }

        if (lineNumber === this.hoveredLineNumber) {
          hint.classList.add("is-hovered");
        }

        if (lineHint && !isTitleLine) {
          const numberHost = document.createElement("span");
          numberHost.className = "hint-line-number-host";
          const stableIdElements = this.createStableIdElements(lineHint.stableIdentity);
          if (stableIdElements) {
            numberHost.classList.add("has-stable-id");
          }

          const number = document.createElement("span");
          number.className = "hint-line-number";
          number.textContent = String(lineHint.blockLineNumber || "");
          if (stableIdElements) {
            numberHost.append(...stableIdElements);
          }

          numberHost.append(number);
          hint.append(numberHost);
        }

        if (isTitleLine) {
          const node = nodesByLine.get(lineNumber);
          const titleHost = document.createElement("span");
          titleHost.className = "hint-line-title-host";
          titleHost.dataset.sourceLine = String(lineNumber);
          const clearDropTarget = () => {
            if (!this.pointerDragDropTarget) {
              return;
            }

            this.pointerDragDropTarget.classList.remove("is-drop-target");
            this.pointerDragDropTarget = null;
          };
          const handleTitleDragOver = (event) => {
            if (!this.draggedNodeSourceLine || this.draggedNodeSourceLine === lineNumber) {
              return;
            }

            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = "move";
            }
            titleHost.classList.add("is-drop-target");
          };
          const handleTitleDragLeave = () => {
            titleHost.classList.remove("is-drop-target");
          };
          const handleTitleDrop = (event) => {
            event.preventDefault();
            titleHost.classList.remove("is-drop-target");
            this.notifyBlockReorderRequested(this.draggedNodeSourceLine, lineNumber);
            this.draggedNodeSourceLine = 0;
          };
          hint.addEventListener("dragover", handleTitleDragOver);
          hint.addEventListener("dragleave", handleTitleDragLeave);
          hint.addEventListener("drop", handleTitleDrop);
          titleHost.addEventListener("dragover", handleTitleDragOver);
          titleHost.addEventListener("dragleave", handleTitleDragLeave);
          titleHost.addEventListener("drop", handleTitleDrop);

          const controls = document.createElement("span");
          controls.className = "hint-line-controls";

          const addButton = document.createElement("button");
          addButton.type = "button";
          addButton.className = "hint-line-action-button hint-line-add-button";
          addButton.setAttribute("aria-label", "Add block below");
          addButton.title = "Add block below";
          addButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.notifyAddBlockRequested(lineNumber);
          });

          const addGlyph = document.createElement("span");
          addGlyph.className = "hint-line-action-glyph";
          addGlyph.textContent = "+";
          addButton.append(addGlyph);

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "hint-line-action-button hint-line-edit-button";
          editButton.setAttribute("aria-label", "Rename block");
          editButton.title = "Rename block";
          editButton.textContent = "edit";
          editButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.notifyBlockRenameRequested(lineNumber);
          });

          const grip = document.createElement("span");
          grip.className = "hint-line-grip";
          grip.title = "Drag to reorder block";
          grip.draggable = true;
          grip.setAttribute("aria-label", "Drag to reorder block");
          grip.setAttribute("role", "button");
          grip.addEventListener("dragstart", (event) => {
            this.draggedNodeSourceLine = lineNumber;
            titleHost.classList.add("is-dragging");
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(lineNumber));
          });
          grip.addEventListener("dragend", () => {
            this.draggedNodeSourceLine = 0;
            titleHost.classList.remove("is-dragging");
          });
          grip.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            this.pointerDraggedNodeSourceLine = lineNumber;
            titleHost.classList.add("is-dragging");
            grip.setPointerCapture(event.pointerId);
          });
          grip.addEventListener("pointermove", (event) => {
            if (!this.pointerDraggedNodeSourceLine) {
              return;
            }

            const target = this.findNearestTitleDropTarget(event.clientY);
            const targetLine = Number(target?.dataset?.sourceLine || 0);
            if (!target || !targetLine || targetLine === this.pointerDraggedNodeSourceLine) {
              clearDropTarget();
              return;
            }

            if (this.pointerDragDropTarget !== target) {
              clearDropTarget();
              this.pointerDragDropTarget = target;
              this.pointerDragDropTarget.classList.add("is-drop-target");
            }
          });
          grip.addEventListener("pointerup", (event) => {
            if (!this.pointerDraggedNodeSourceLine) {
              return;
            }

            const targetLine = Number(this.pointerDragDropTarget?.dataset?.sourceLine || 0);
            const sourceLine = this.pointerDraggedNodeSourceLine;
            this.pointerDraggedNodeSourceLine = 0;
            clearDropTarget();
            titleHost.classList.remove("is-dragging");
            if (grip.hasPointerCapture(event.pointerId)) {
              grip.releasePointerCapture(event.pointerId);
            }

            this.notifyBlockReorderRequested(sourceLine, targetLine);
          });
          grip.addEventListener("pointercancel", (event) => {
            this.pointerDraggedNodeSourceLine = 0;
            clearDropTarget();
            titleHost.classList.remove("is-dragging");
            if (grip.hasPointerCapture(event.pointerId)) {
              grip.releasePointerCapture(event.pointerId);
            }
          });
          for (let index = 0; index < 6; index += 1) {
            const gripDot = document.createElement("span");
            gripDot.className = "hint-line-grip-dot";
            grip.append(gripDot);
          }

          controls.append(addButton, editButton);
          if ((node?.incomingReferenceCount || 0) > 0) {
            const referenceButton = document.createElement("button");
            referenceButton.type = "button";
            referenceButton.className = "hint-line-reference-button";
            referenceButton.textContent = `${node.incomingReferenceCount} refs`;
            referenceButton.title = `${node.incomingReferenceCount} references`;
            referenceButton.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              this.notifyReferenceListRequested(node, referenceButton.getBoundingClientRect());
            });
            controls.append(referenceButton);
          }

          controls.append(grip);
          titleHost.append(controls);
          hint.append(titleHost);
        }

        return hint;
      })
    );
    this.hintRailContentElement = content;
    this.hintRailElement.replaceChildren(content);
    this.syncHintRailScroll();
  }

  createStableIdElements(stableIdentity) {
    if (stableIdentity?.status !== "available") {
      return null;
    }

    const text = this.formatStableLineId(stableIdentity.value || stableIdentity.label || "");
    if (!text) {
      return null;
    }

    const stableId = document.createElement("span");
    stableId.className = "hint-stable-id";
    stableId.textContent = text;
    stableId.title = text;

    const copyButton = document.createElement("button");
    copyButton.className = "hint-stable-id-copy";
    copyButton.type = "button";
    copyButton.title = "Copy stable line id";
    copyButton.setAttribute("aria-label", "Copy stable line id");
    copyButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void navigator.clipboard?.writeText(text);
    });

    return [stableId, copyButton];
  }

  formatStableLineId(lineId) {
    return String(lineId || "").replace(/^line_/, "");
  }

  syncHintRailScroll() {
    if (!this.hintRailContentElement) {
      return;
    }

    this.hintRailContentElement.style.transform = `translateY(${-this.editor.getScrollTop()}px)`;
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

  findNearestTitleDropTarget(clientY) {
    const titleHosts = [...this.hintRailElement.querySelectorAll(".hint-line-title-host")];
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const titleHost of titleHosts) {
      const lineNumber = Number(titleHost.dataset.sourceLine || 0);
      if (!lineNumber || lineNumber === this.pointerDraggedNodeSourceLine) {
        continue;
      }

      const bounds = titleHost.getBoundingClientRect();
      const centerY = bounds.top + bounds.height / 2;
      const distance = Math.abs(centerY - clientY);
      if (distance < nearestDistance) {
        nearest = titleHost;
        nearestDistance = distance;
      }
    }

    return nearest;
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
    if (!this.currentDocumentModel) {
      return;
    }

    if (!this.semanticHighlightEnabled) {
      this.semanticDecorationIds = this.editor.deltaDecorations(this.semanticDecorationIds, []);
      return;
    }

    const decorations = [];
    const model = this.editor.getModel();
    for (const node of this.currentDocumentModel.nodes) {
      decorations.push({
        range: new this.monaco.Range(node.sourceLine, 1, node.sourceLine, model?.getLineMaxColumn(node.sourceLine) || 1),
        options: {
          inlineClassName: "inscape-node-title-text",
        },
      });

      for (const line of node.lines) {
        const inlineClassName = this.mapAuthoringLineClass(line.kind);
        if (!inlineClassName) {
          continue;
        }

        decorations.push({
          range: new this.monaco.Range(line.sourceLine, 1, line.sourceLine, model?.getLineMaxColumn(line.sourceLine) || 1),
          options: {
            inlineClassName,
          },
        });
        decorations.push(...this.createInlineTokenDecorations(line.sourceLine));
      }

      for (const choice of node.choices) {
        decorations.push({
          range: new this.monaco.Range(choice.sourceLine, 1, choice.sourceLine, model?.getLineMaxColumn(choice.sourceLine) || 1),
          options: {
            inlineClassName: "inscape-choice-text",
          },
        });
        decorations.push(...this.createInlineTokenDecorations(choice.sourceLine));
      }
    }

    this.semanticDecorationIds = this.editor.deltaDecorations(this.semanticDecorationIds, decorations);
  }

  renderActiveBlockDecorations() {
    if (!this.semanticHighlightEnabled) {
      this.activeBlockDecorationIds = this.editor.deltaDecorations(this.activeBlockDecorationIds, []);
      return;
    }

    const activeNode = (this.currentDocumentModel?.nodes || []).find(
      (node) => node.sourceLine <= this.activeLineNumber && this.activeLineNumber <= node.endLine
    );
    if (!activeNode) {
      this.activeBlockDecorationIds = this.editor.deltaDecorations(this.activeBlockDecorationIds, []);
      return;
    }

    const model = this.editor.getModel();
    const decorations = [];
    for (const node of this.currentDocumentModel?.nodes || []) {
      decorations.push({
        range: new this.monaco.Range(
          node.sourceLine,
          1,
          node.endLine,
          model?.getLineMaxColumn(node.endLine) || 1
        ),
        options: {
          isWholeLine: true,
          wholeLineClassName: "inscape-node-block-background",
        },
      });
    }

    decorations.push(
      {
        range: new this.monaco.Range(
          activeNode.sourceLine,
          1,
          activeNode.endLine,
          model?.getLineMaxColumn(activeNode.endLine) || 1
        ),
        options: {
          isWholeLine: true,
          wholeLineClassName: "inscape-node-block-active",
        },
      },
      {
        range: new this.monaco.Range(activeNode.sourceLine, 1, activeNode.sourceLine, 1),
        options: {
          isWholeLine: true,
          wholeLineClassName: "inscape-node-title-active",
        },
      }
    );
    this.activeBlockDecorationIds = this.editor.deltaDecorations(this.activeBlockDecorationIds, decorations);
  }

  createInlineTokenDecorations(sourceLine) {
    const model = this.editor.getModel();
    const text = model?.getLineContent(sourceLine) || "";
    const decorations = [];
    const metadataMatch = text.match(/^\s*@\S+(?:\s+\S+)*/);
    if (metadataMatch) {
      decorations.push({
        range: new this.monaco.Range(sourceLine, 1, sourceLine, metadataMatch[0].length + 1),
        options: {
          inlineClassName: "inscape-metadata-token-text",
        },
      });
    }

    const queryPattern = /\[[^\]\r\n]+\]/g;
    for (const match of text.matchAll(queryPattern)) {
      decorations.push({
        range: new this.monaco.Range(sourceLine, match.index + 1, sourceLine, match.index + match[0].length + 1),
        options: {
          inlineClassName: "inscape-query-token-text",
        },
      });
    }

    return decorations;
  }

  mapAuthoringLineClass(kind) {
    if (kind === "prompt") {
      return "inscape-prompt-text";
    }

    if (kind === "narration") {
      return "inscape-narration-text";
    }

    if (kind === "dialogue") {
      return "inscape-dialogue-text";
    }

    if (kind === "metadata") {
      return "inscape-metadata-line-text";
    }

    return "";
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
