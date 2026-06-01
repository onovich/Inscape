export class EditorCompletionTargetModelBuilder {
  static build(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    const beforeCursor = lineContent.slice(0, Math.max(0, position.column - 1));
    const queryTarget = this.tryBuildQueryTarget(beforeCursor, position);
    if (queryTarget) {
      return queryTarget;
    }

    const hostEventTarget = this.tryBuildHostEventTarget(beforeCursor, position);
    if (hostEventTarget) {
      return hostEventTarget;
    }

    const hostBindingTarget = this.tryBuildHostBindingTarget(beforeCursor, position);
    if (hostBindingTarget) {
      return hostBindingTarget;
    }

    const jumpTarget = this.tryBuildJumpTarget(beforeCursor, position);
    if (jumpTarget) {
      return jumpTarget;
    }

    return this.tryBuildSpeakerTarget(beforeCursor, position);
  }

  static tryBuildJumpTarget(beforeCursor, position) {
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
      kind: "node",
      typedPrefix,
      wordRange: {
        startColumn: targetStartColumn,
        endColumn: targetEndColumn,
      },
    };
  }

  static tryBuildQueryTarget(beforeCursor, position) {
    const openBracket = beforeCursor.lastIndexOf("[");
    const closeBracket = beforeCursor.lastIndexOf("]");
    if (openBracket <= closeBracket) {
      return null;
    }

    const typedPrefix = beforeCursor.slice(openBracket + 1);
    if (typedPrefix.includes(":") || (typedPrefix.length > 0 && !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(typedPrefix))) {
      return null;
    }

    return {
      kind: "query",
      typedPrefix,
      wordRange: {
        startColumn: openBracket + 2,
        endColumn: position.column,
      },
    };
  }

  static tryBuildHostEventTarget(beforeCursor, position) {
    const match = /^(\s*@emit(?::|\s+)\s*)([A-Za-z_][A-Za-z0-9_.-]*)?$/.exec(beforeCursor);
    if (!match) {
      return null;
    }

    return {
      kind: "host-event",
      typedPrefix: match[2] || "",
      wordRange: {
        startColumn: match[1].length + 1,
        endColumn: position.column,
      },
    };
  }

  static tryBuildHostBindingTarget(beforeCursor, position) {
    const match = /^(\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*)([^\s\]]*)$/.exec(beforeCursor);
    if (!match) {
      return null;
    }

    return {
      bindingKind: "timeline",
      kind: "host-binding",
      typedPrefix: match[2] || "",
      wordRange: {
        startColumn: match[1].length + 1,
        endColumn: position.column,
      },
    };
  }

  static tryBuildSpeakerTarget(beforeCursor, position) {
    if (beforeCursor.includes(":") || beforeCursor.includes("：") || beforeCursor.includes("->")) {
      return null;
    }

    const match = /^(\s*)([^#@\-\?\[\]\s][^:：]{0,80})$/.exec(beforeCursor);
    if (!match) {
      return null;
    }

    const typedPrefix = match[2].trimStart();
    if (!typedPrefix) {
      return null;
    }

    return {
      kind: "speaker",
      typedPrefix,
      wordRange: {
        startColumn: match[1].length + 1,
        endColumn: position.column,
      },
    };
  }
}
