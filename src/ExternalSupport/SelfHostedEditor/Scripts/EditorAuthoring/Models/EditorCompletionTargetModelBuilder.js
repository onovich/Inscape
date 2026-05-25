export class EditorCompletionTargetModelBuilder {
  static build(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.slice(0, Math.max(0, position.column - 1));
    const arrowIndex = beforeCursor.lastIndexOf("->");
    if (arrowIndex < 0) {
      return null;
    }

    const targetStartIndex = arrowIndex + 2;
    const betweenArrowAndCursor = beforeCursor.slice(targetStartIndex);
    if (betweenArrowAndCursor.includes("-") || betweenArrowAndCursor.includes("?")) {
      return null;
    }

    const leadingWhitespaceLength = betweenArrowAndCursor.length - betweenArrowAndCursor.trimStart().length;
    const typedPrefix = betweenArrowAndCursor.slice(leadingWhitespaceLength);
    const targetStartColumn = targetStartIndex + leadingWhitespaceLength + 1;
    const targetEndColumn = position.column;

    return {
      typedPrefix,
      wordRange: {
        startColumn: targetStartColumn,
        endColumn: targetEndColumn,
      },
    };
  }
}
