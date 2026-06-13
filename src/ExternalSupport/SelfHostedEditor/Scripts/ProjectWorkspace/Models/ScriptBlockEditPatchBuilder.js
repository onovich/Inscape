export class ScriptBlockEditPatchBuilder {
  static insertNodeBelow(scriptText, node, nodes = []) {
    const lines = scriptText.split(/\r?\n/);
    const insertIndex = Math.min(lines.length, node.endLine);
    const nextTitle = this.createNextUntitledTitle(nodes);
    const blockLines = ["", `# ${nextTitle}`, ""];
    lines.splice(insertIndex, 0, ...blockLines);
    return lines.join("\n");
  }

  static moveNodeBefore(scriptText, sourceNode, targetNode) {
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

  static retargetGraphEdge(scriptText, sourceLine, targetTitle) {
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

  static createNextUntitledTitle(nodes) {
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
}
