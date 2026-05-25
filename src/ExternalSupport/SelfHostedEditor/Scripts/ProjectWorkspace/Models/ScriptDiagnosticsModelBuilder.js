import { ScriptDocumentModelBuilder } from "./ScriptDocumentModelBuilder.js";

export class ScriptDiagnosticsModelBuilder {
  static build(scriptText) {
    const documentModel = ScriptDocumentModelBuilder.build(scriptText);
    const diagnostics = [];
    const lines = scriptText.split(/\r?\n/);
    const nodeTitles = new Map();

    for (const node of documentModel.nodes) {
      const title = node.title.trim();
      if (!title) {
        diagnostics.push({
          endColumn: this.getLineEndColumn(lines, node.sourceLine),
          severity: "error",
          startColumn: 1,
          sourceLine: node.sourceLine,
          message: "Node title is empty.",
        });
        continue;
      }

      if (nodeTitles.has(title)) {
        diagnostics.push({
          endColumn: this.getLineEndColumn(lines, node.sourceLine),
          severity: "error",
          startColumn: 1,
          sourceLine: node.sourceLine,
          message: `Duplicate node title: ${title}`,
        });
      } else {
        nodeTitles.set(title, node.sourceLine);
      }
    }

    for (const node of documentModel.nodes) {
      for (const choice of node.choices) {
        if (!choice.text) {
          diagnostics.push({
            endColumn: this.getLineEndColumn(lines, choice.sourceLine),
            severity: "warning",
            startColumn: 1,
            sourceLine: choice.sourceLine,
            message: "Choice text is empty.",
          });
        }

        if (choice.target && !nodeTitles.has(choice.target)) {
          diagnostics.push({
            endColumn: this.getLineEndColumn(lines, choice.sourceLine),
            severity: "error",
            startColumn: 1,
            sourceLine: choice.sourceLine,
            message: `Missing choice target: ${choice.target}`,
          });
        }
      }

      for (const jump of node.jumps) {
        if (jump.target && !nodeTitles.has(jump.target)) {
          diagnostics.push({
            endColumn: this.getLineEndColumn(lines, jump.sourceLine),
            severity: "error",
            startColumn: 1,
            sourceLine: jump.sourceLine,
            message: `Missing jump target: ${jump.target}`,
          });
        }
      }
    }

    return diagnostics;
  }

  static getLineEndColumn(lines, sourceLine) {
    const lineIndex = Math.max(sourceLine - 1, 0);
    const lineLength = lines[lineIndex]?.length || 0;
    return Math.max(lineLength + 1, 2);
  }
}
