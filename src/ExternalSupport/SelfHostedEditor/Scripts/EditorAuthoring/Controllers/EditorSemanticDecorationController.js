export class EditorSemanticDecorationController {
  constructor({
    editor,
    monaco,
  }) {
    this.editor = editor;
    this.monaco = monaco;
    this.semanticDecorationIds = [];
    this.activeBlockDecorationIds = [];
    this.isEnabled = true;
  }

  setEnabled(isEnabled) {
    this.isEnabled = Boolean(isEnabled);
  }

  renderSemanticDecorations(documentModel) {
    if (!documentModel) {
      return;
    }

    if (!this.isEnabled) {
      this.semanticDecorationIds = this.editor.deltaDecorations(this.semanticDecorationIds, []);
      return;
    }

    const decorations = [];
    const model = this.editor.getModel();
    for (const node of documentModel.nodes) {
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

  renderActiveBlockDecorations(documentModel, activeLineNumber) {
    if (!this.isEnabled) {
      this.activeBlockDecorationIds = this.editor.deltaDecorations(this.activeBlockDecorationIds, []);
      return;
    }

    const activeNode = (documentModel?.nodes || []).find(
      (node) => node.sourceLine <= activeLineNumber && activeLineNumber <= node.endLine
    );
    if (!activeNode) {
      this.activeBlockDecorationIds = this.editor.deltaDecorations(this.activeBlockDecorationIds, []);
      return;
    }

    const model = this.editor.getModel();
    const decorations = [];
    for (const node of documentModel?.nodes || []) {
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
}
