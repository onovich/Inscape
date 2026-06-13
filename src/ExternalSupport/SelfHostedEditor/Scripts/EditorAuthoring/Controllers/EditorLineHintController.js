export class EditorLineHintController {
  constructor({
    editor,
    hintRailElement,
    monaco,
    onAddBlockRequested,
    onBlockRenameRequested,
    onBlockReorderRequested,
    onReferenceListRequested,
  }) {
    this.editor = editor;
    this.hintRailElement = hintRailElement;
    this.monaco = monaco;
    this.onAddBlockRequested = onAddBlockRequested;
    this.onBlockRenameRequested = onBlockRenameRequested;
    this.onBlockReorderRequested = onBlockReorderRequested;
    this.onReferenceListRequested = onReferenceListRequested;
    this.hintRailContentElement = null;
    this.draggedNodeSourceLine = 0;
    this.pointerDraggedNodeSourceLine = 0;
    this.pointerDragDropTarget = null;
  }

  render(documentModel, activeLineNumber, hoveredLineNumber) {
    const lineCount = this.editor.getModel()?.getLineCount() || 0;
    const editorOption = this.monaco.editor.EditorOption || {};
    const lineHeight = editorOption.lineHeight ? this.editor.getOption(editorOption.lineHeight) : 36;
    const lineHintsByLine = new Map((documentModel?.lineHints || []).map((lineHint) => [lineHint.sourceLine, lineHint]));
    const nodesByLine = new Map((documentModel?.nodes || []).map((node) => [node.sourceLine, node]));
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

        if (lineNumber === activeLineNumber) {
          hint.classList.add("is-active");
        }

        if (lineNumber === hoveredLineNumber) {
          hint.classList.add("is-hovered");
        }

        if (lineHint && !isTitleLine) {
          hint.append(this.createLineNumberHost(lineHint));
        }

        if (isTitleLine) {
          const node = nodesByLine.get(lineNumber);
          hint.append(this.createTitleHost(lineNumber, node, hint));
        }

        return hint;
      })
    );
    this.hintRailContentElement = content;
    this.hintRailElement.replaceChildren(content);
    this.syncScroll();
  }

  createLineNumberHost(lineHint) {
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
    return numberHost;
  }

  createTitleHost(lineNumber, node, hintElement) {
    const titleHost = document.createElement("span");
    titleHost.className = "hint-line-title-host";
    titleHost.dataset.sourceLine = String(lineNumber);
    this.attachTitleDropTargetHandlers(hintElement, titleHost, lineNumber);
    this.attachTitleDropTargetHandlers(titleHost, titleHost, lineNumber);

    const controls = document.createElement("span");
    controls.className = "hint-line-controls";
    controls.append(
      this.createAddButton(lineNumber),
      this.createRenameButton(lineNumber)
    );
    if ((node?.incomingReferenceCount || 0) > 0) {
      controls.append(this.createReferenceButton(node));
    }
    controls.append(this.createGrip(lineNumber, titleHost));
    titleHost.append(controls);
    return titleHost;
  }

  attachTitleDropTargetHandlers(targetElement, titleHost, lineNumber) {
    targetElement.addEventListener("dragover", (event) => {
      if (!this.draggedNodeSourceLine || this.draggedNodeSourceLine === lineNumber) {
        return;
      }

      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      titleHost.classList.add("is-drop-target");
    });
    targetElement.addEventListener("dragleave", () => {
      titleHost.classList.remove("is-drop-target");
    });
    targetElement.addEventListener("drop", (event) => {
      event.preventDefault();
      titleHost.classList.remove("is-drop-target");
      this.onBlockReorderRequested(this.draggedNodeSourceLine, lineNumber);
      this.draggedNodeSourceLine = 0;
    });
  }

  createAddButton(lineNumber) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "hint-line-action-button hint-line-add-button";
    addButton.setAttribute("aria-label", "Add block below");
    addButton.title = "Add block below";
    addButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onAddBlockRequested(lineNumber);
    });

    const addGlyph = document.createElement("span");
    addGlyph.className = "hint-line-action-glyph";
    addGlyph.textContent = "+";
    addButton.append(addGlyph);
    return addButton;
  }

  createRenameButton(lineNumber) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "hint-line-action-button hint-line-edit-button";
    editButton.setAttribute("aria-label", "Rename block");
    editButton.title = "Rename block";
    editButton.textContent = "edit";
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onBlockRenameRequested(lineNumber);
    });
    return editButton;
  }

  createReferenceButton(node) {
    const referenceButton = document.createElement("button");
    referenceButton.type = "button";
    referenceButton.className = "hint-line-reference-button";
    referenceButton.textContent = `${node.incomingReferenceCount} refs`;
    referenceButton.title = `${node.incomingReferenceCount} references`;
    referenceButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onReferenceListRequested(node, referenceButton.getBoundingClientRect?.() || null);
    });
    return referenceButton;
  }

  createGrip(lineNumber, titleHost) {
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
    this.attachPointerGripHandlers(grip, titleHost, lineNumber);
    for (let index = 0; index < 6; index += 1) {
      const gripDot = document.createElement("span");
      gripDot.className = "hint-line-grip-dot";
      grip.append(gripDot);
    }
    return grip;
  }

  attachPointerGripHandlers(grip, titleHost, lineNumber) {
    grip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.pointerDraggedNodeSourceLine = lineNumber;
      titleHost.classList.add("is-dragging");
      grip.setPointerCapture?.(event.pointerId);
    });
    grip.addEventListener("pointermove", (event) => {
      if (!this.pointerDraggedNodeSourceLine) {
        return;
      }

      const target = this.findNearestTitleDropTarget(event.clientY);
      const targetLine = Number(target?.dataset?.sourceLine || 0);
      if (!target || !targetLine || targetLine === this.pointerDraggedNodeSourceLine) {
        this.clearDropTarget();
        return;
      }

      if (this.pointerDragDropTarget !== target) {
        this.clearDropTarget();
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
      this.clearDropTarget();
      titleHost.classList.remove("is-dragging");
      if (grip.hasPointerCapture?.(event.pointerId)) {
        grip.releasePointerCapture?.(event.pointerId);
      }

      this.onBlockReorderRequested(sourceLine, targetLine);
    });
    grip.addEventListener("pointercancel", (event) => {
      this.pointerDraggedNodeSourceLine = 0;
      this.clearDropTarget();
      titleHost.classList.remove("is-dragging");
      if (grip.hasPointerCapture?.(event.pointerId)) {
        grip.releasePointerCapture?.(event.pointerId);
      }
    });
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

  syncScroll() {
    if (!this.hintRailContentElement) {
      return;
    }

    this.hintRailContentElement.style.transform = `translateY(${-this.editor.getScrollTop()}px)`;
  }

  clearDropTarget() {
    if (!this.pointerDragDropTarget) {
      return;
    }

    this.pointerDragDropTarget.classList.remove("is-drop-target");
    this.pointerDragDropTarget = null;
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

      const bounds = titleHost.getBoundingClientRect?.() || { height: 0, top: 0 };
      const centerY = bounds.top + bounds.height / 2;
      const distance = Math.abs(centerY - clientY);
      if (distance < nearestDistance) {
        nearest = titleHost;
        nearestDistance = distance;
      }
    }

    return nearest;
  }
}
