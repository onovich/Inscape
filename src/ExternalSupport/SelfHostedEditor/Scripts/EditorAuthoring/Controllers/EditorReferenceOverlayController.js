export class EditorReferenceOverlayController {
  constructor(frameElement, editorController, referencesBridge, workspaceContextProvider = null, hostBindingBridge = null) {
    this.frameElement = frameElement;
    this.editorController = editorController;
    this.referencesBridge = referencesBridge;
    this.workspaceContextProvider = workspaceContextProvider;
    this.hostBindingBridge = hostBindingBridge;
    this.sourceLineSelectedHandlers = [];
    this.currentNode = null;
    this.anchorPosition = null;
    this.overlayElement = document.createElement("section");
    this.overlayElement.className = "editor-reference-overlay is-hidden";
    this.frameElement.append(this.overlayElement);

    this.editorController.getEditor().onDidScrollChange(() => {
      this.reposition();
    });

    window.addEventListener("resize", () => {
      this.reposition();
    });

    document.addEventListener("mousedown", (event) => {
      if (this.overlayElement.classList.contains("is-hidden")) {
        return;
      }

      if (this.overlayElement.contains(event.target) || !this.frameElement.contains(event.target)) {
        return;
      }

      this.close();
    });
  }

  onSourceLineSelected(handler) {
    this.sourceLineSelectedHandlers.push(handler);
  }

  async openForNode(node, anchorRect = null) {
    if (!node) {
      return;
    }

    this.currentNode = node;
    this.anchorPosition = this.createAnchorPosition(node, anchorRect);
    const references = await this.referencesBridge.getReferences(this.editorController.getText(), {
      kind: "node",
      name: node.title,
      startColumn: 1,
      endColumn: 1,
    });

    const visibleReferences = references.filter(
      (reference) => reference.location.line + 1 !== node.sourceLine
    );

    this.render(node, visibleReferences);
    this.overlayElement.style.visibility = "hidden";
    this.overlayElement.classList.remove("is-hidden");
    this.reposition();
    this.overlayElement.style.visibility = "";
  }

  async openForTarget(target, anchorRect = null) {
    if (!target || (target.kind !== "speaker" && target.kind !== "host-binding") || !this.hostBindingBridge) {
      return;
    }

    const lineNumber = Number(target.lineNumber || this.editorController.getEditor().getPosition()?.lineNumber || 1);
    const overlayTarget = {
      sourceLine: lineNumber,
      title: target.name,
    };
    this.currentNode = overlayTarget;
    this.anchorPosition = this.createAnchorPosition(overlayTarget, anchorRect);
    const references = await this.hostBindingBridge.getReferences(this.editorController.getText(), target);
    this.renderTarget(target, references);
    this.overlayElement.style.visibility = "hidden";
    this.overlayElement.classList.remove("is-hidden");
    this.reposition();
    this.overlayElement.style.visibility = "";
  }

  close() {
    this.currentNode = null;
    this.anchorPosition = null;
    this.overlayElement.classList.add("is-hidden");
    this.overlayElement.replaceChildren();
  }

  render(node, references) {
    this.renderReferenceList({
      emptyText: "No incoming references.",
      references,
      target: {
        kind: "node",
        name: node.title,
        title: node.title,
      },
      titleText: `${node.title} - ${references.length} refs`,
    });
  }

  renderTarget(target, references) {
    const label = target.kind === "speaker"
      ? `Speaker ${target.name}`
      : `${target.bindingKind || "binding"}:${target.name}`;
    this.renderReferenceList({
      emptyText: "No matching references.",
      references,
      target,
      titleText: `${label} - ${references.length} refs`,
    });
  }

  renderReferenceList({ emptyText, references, target, titleText }) {
    const titleRow = document.createElement("div");
    titleRow.className = "editor-reference-overlay-header";

    const title = document.createElement("strong");
    title.textContent = titleText;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "editor-reference-overlay-close";
    closeButton.textContent = "x";
    closeButton.addEventListener("click", () => this.close());

    titleRow.append(title, closeButton);

    const list = document.createElement("div");
    list.className = "editor-reference-overlay-list";

    if (references.length === 0) {
      const empty = document.createElement("div");
      empty.className = "editor-reference-overlay-empty";
      empty.textContent = emptyText;
      list.append(empty);
    } else {
      for (const reference of references) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "editor-reference-overlay-item";

        const model = this.buildReferencePreviewModel(reference, target);

        const summary = document.createElement("span");
        summary.className = "editor-reference-overlay-summary";
        summary.textContent = model.summary;

        const context = document.createElement("span");
        context.className = "editor-reference-overlay-context";
        for (const line of model.contextLines) {
          const lineElement = document.createElement("span");
          lineElement.className = "editor-reference-overlay-context-line";
          if (line.isHit) {
            lineElement.classList.add("is-hit");
            this.appendHighlightedText(lineElement, line.text, target.name || target.title || "");
          } else {
            lineElement.textContent = line.text;
          }

          context.append(lineElement);
        }

        button.append(summary, context);
        button.addEventListener("click", () => {
          for (const handler of this.sourceLineSelectedHandlers) {
            handler({
              lineNumber: reference.location.line + 1,
              sourcePath: reference.location.sourcePath || "",
            });
          }
          this.close();
        });
        list.append(button);
      }
    }

    this.overlayElement.replaceChildren(titleRow, list);
  }

  reposition() {
    if (!this.currentNode || this.overlayElement.classList.contains("is-hidden")) {
      return;
    }

    const editor = this.editorController.getEditor();
    const frameBounds = this.frameElement.getBoundingClientRect();
    const lineTop = editor.getTopForLineNumber(this.currentNode.sourceLine) - editor.getScrollTop();
    const anchor = this.anchorPosition || {
      height: 18,
      left: 42,
      topDeltaFromLine: 0,
      width: 72,
    };
    const overlayWidth = this.overlayElement.offsetWidth || 480;
    const overlayHeight = this.overlayElement.offsetHeight || 260;
    const preferredLeft = anchor.left - 14;
    const preferredTop = lineTop + anchor.topDeltaFromLine + anchor.height + 8;
    const maxLeft = Math.max(12, frameBounds.width - overlayWidth - 12);
    const maxTop = Math.max(12, frameBounds.height - overlayHeight - 12);
    const left = this.clamp(preferredLeft, 12, maxLeft);
    const top = this.clamp(preferredTop, 12, maxTop);
    this.overlayElement.style.left = `${left}px`;
    this.overlayElement.style.top = `${top}px`;
  }

  createAnchorPosition(node, anchorRect) {
    if (!anchorRect) {
      return null;
    }

    const editor = this.editorController.getEditor();
    const frameBounds = this.frameElement.getBoundingClientRect();
    const lineTop = editor.getTopForLineNumber(node.sourceLine) - editor.getScrollTop();
    return {
      height: anchorRect.height,
      left: anchorRect.left - frameBounds.left,
      topDeltaFromLine: anchorRect.top - frameBounds.top - lineTop,
      width: anchorRect.width,
    };
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  getReferenceLabel(reference) {
    const lineLabel = `line ${reference.location.line + 1}`;
    const sourcePath = this.toWorkspaceRelativePath(reference.location.sourcePath || "");
    if (!sourcePath) {
      return lineLabel;
    }

    return `${sourcePath}:${lineLabel}`;
  }

  buildReferencePreviewModel(reference, target) {
    const document = this.getReferenceDocument(reference);
    const lineNumber = reference.location.line + 1;
    const lines = document?.text?.split(/\r?\n/) || [];
    const hitText = lines[lineNumber - 1]?.trim() || "";
    const contextLines = this.getContextLines(lines, lineNumber);
    return {
      contextLines,
      summary: this.getReferenceSummary(hitText, target),
    };
  }

  getReferenceDocument(reference) {
    const context = this.workspaceContextProvider?.();
    const sourcePath = this.toWorkspaceRelativePath(reference.location.sourcePath || context?.currentFilePath || "");
    return context?.documents?.find((item) => item.relativePath === sourcePath)
      || context?.documents?.find((item) => this.pathsReferToSameDocument(item.relativePath, sourcePath))
      || context?.documents?.find((item) => item.relativePath === context.currentFilePath);
  }

  getContextLines(lines, lineNumber) {
    const startLine = Math.max(1, lineNumber - 2);
    const endLine = Math.min(lines.length, lineNumber + 2);
    const result = [];
    for (let current = startLine; current <= endLine; current += 1) {
      const text = lines[current - 1]?.trimEnd();
      if (!text) {
        continue;
      }

      result.push({
        isHit: current === lineNumber,
        lineNumber: current,
        text,
      });
    }

    return result.length > 0
      ? result
      : [{
        isHit: true,
        lineNumber,
        text: "Reference source preview unavailable.",
      }];
  }

  getReferenceSummary(lineText, target) {
    const targetTitle = target.name || target.title || "";
    const trimmed = lineText.trim();
    if (target.kind === "speaker") {
      return `Speaker ${targetTitle}`;
    }

    if (target.kind === "host-binding") {
      return `${target.bindingKind || "binding"} -> ${targetTitle}`;
    }

    if (trimmed.startsWith("- ")) {
      const body = trimmed.slice(2).trim();
      const [choiceText, target] = body.split("->").map((part) => part.trim());
      return `${choiceText || "Choice"} -> ${target || targetTitle}`;
    }

    if (trimmed.startsWith("-> ")) {
      return `Jump -> ${trimmed.slice(3).trim() || targetTitle}`;
    }

    return `Reference -> ${targetTitle}`;
  }

  appendHighlightedText(element, text, targetTitle) {
    const index = text.indexOf(targetTitle);
    if (index < 0) {
      element.textContent = text;
      return;
    }

    element.append(
      document.createTextNode(text.slice(0, index))
    );
    const mark = document.createElement("mark");
    mark.textContent = targetTitle;
    element.append(
      mark,
      document.createTextNode(text.slice(index + targetTitle.length))
    );
  }

  getReferencePreview(reference) {
    const document = this.getReferenceDocument(reference);
    const lineNumber = reference.location.line + 1;
    const lineText = document?.text?.split(/\r?\n/)?.[lineNumber - 1]?.trim();
    return lineText || "Reference source preview unavailable.";
  }

  toWorkspaceRelativePath(sourcePath) {
    const context = this.workspaceContextProvider?.();
    if (!sourcePath) {
      return "";
    }

    const normalizedPath = sourcePath.replace(/\\/g, "/");
    const exactDocument = context?.documents?.find((item) => item.relativePath === normalizedPath);
    if (exactDocument) {
      return exactDocument.relativePath;
    }

    const suffixDocument = context?.documents?.find((item) =>
      normalizedPath.endsWith(`/${item.relativePath}`) || normalizedPath.endsWith(item.relativePath)
    );
    return suffixDocument?.relativePath || normalizedPath;
  }

  pathsReferToSameDocument(left, right) {
    if (!left || !right) {
      return false;
    }

    const normalizedLeft = left.replace(/\\/g, "/");
    const normalizedRight = right.replace(/\\/g, "/");
    return normalizedLeft === normalizedRight
      || normalizedLeft.endsWith(`/${normalizedRight}`)
      || normalizedRight.endsWith(`/${normalizedLeft}`);
  }
}
