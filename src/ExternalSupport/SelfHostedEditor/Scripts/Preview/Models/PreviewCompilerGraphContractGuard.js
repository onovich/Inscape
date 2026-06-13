export class PreviewCompilerGraphContractGuard {
  buildDocumentModelFromStoryGraph(storyGraphModel) {
    if (storyGraphModel?.provider !== "compiler-project" || !Array.isArray(storyGraphModel.nodes)) {
      return null;
    }

    const activeNodes = storyGraphModel.nodes.filter((node) => node.isInActiveDocument);
    const sourceNodes = activeNodes.length > 0 ? activeNodes : storyGraphModel.nodes;
    const nodes = sourceNodes
      .map((node, index) => {
        const title = node.title || "Untitled Node";
        const previewLines = this.requireCompilerPreviewLines(node, index, title);
        const sourceLine = Number(node.sourceLine || 0);
        if (!Number.isFinite(sourceLine) || sourceLine <= 0) {
          throw new Error(
            `Compiler story graph contract violation: node "${title}" at graph index ${index} has no valid sourceLine.`
          );
        }

        return {
          choices: Array.isArray(node.previewChoices) ? node.previewChoices : [],
          endLine: this.getCompilerNodeEndLine(node, previewLines),
          lines: previewLines,
          sourceLine,
          sourcePath: node.sourcePath || "",
          title,
        };
      });

    if (nodes.length === 0) {
      throw new Error("Compiler story graph contract violation: compiler-project provider returned no preview nodes for the active document.");
    }

    return {
      lineCount: 0,
      nodes,
      title: nodes[0]?.title || "Untitled Node",
    };
  }

  requireCompilerPreviewLines(node, index, title) {
    if (!Array.isArray(node.previewLines)) {
      throw new Error(
        `Compiler story graph contract violation: node "${title}" at graph index ${index} is missing the previewLines array.`
      );
    }

    const compilerLineCount = Array.isArray(node.lines) ? node.lines.length : 0;
    if (compilerLineCount > 0 && node.previewLines.length !== compilerLineCount) {
      throw new Error(
        `Compiler story graph contract violation: node "${title}" has ${compilerLineCount} compiler line(s) but ${node.previewLines.length} previewLines. Preview refuses to render draft fallback content because that would hide lost compiler data.`
      );
    }

    for (const [lineIndex, line] of node.previewLines.entries()) {
      if (Number(line?.sourceLine || 0) <= 0) {
        throw new Error(
          `Compiler story graph contract violation: node "${title}" previewLines[${lineIndex}] has no valid sourceLine.`
        );
      }
    }

    return node.previewLines;
  }

  getCompilerNodeEndLine(node, previewLines) {
    const lineNumbers = [
      Number(node.endLine || 0),
      Number(node.sourceLine || 0),
      ...previewLines.map((line) => Number(line?.sourceLine || 0)),
      ...this.getCompilerChoiceLineNumbers(node.previewChoices),
    ].filter((lineNumber) => Number.isFinite(lineNumber) && lineNumber > 0);
    return Math.max(...lineNumbers, 1);
  }

  getCompilerChoiceLineNumbers(previewChoices) {
    const lineNumbers = [];
    for (const group of Array.isArray(previewChoices) ? previewChoices : []) {
      lineNumbers.push(Number(group?.sourceLine || 0));
      for (const option of Array.isArray(group?.options) ? group.options : []) {
        lineNumbers.push(Number(option?.sourceLine || 0));
      }
    }

    return lineNumbers;
  }
}
