export class EditorHoverTargetModelBuilder {
  static build(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    if (!lineContent.trim()) {
      return null;
    }

    const queryTarget = this.tryBuildQueryTarget(lineContent, position);
    if (queryTarget) {
      return queryTarget;
    }

    const hostEventTarget = this.tryBuildHostEventTarget(lineContent, position);
    if (hostEventTarget) {
      return hostEventTarget;
    }

    const hostBindingTarget = this.tryBuildHostBindingTarget(lineContent, position);
    if (hostBindingTarget) {
      return hostBindingTarget;
    }

    const speakerTarget = this.tryBuildSpeakerTarget(lineContent, position);
    if (speakerTarget) {
      return speakerTarget;
    }

    const nodeTarget = this.tryBuildNodeTarget(lineContent, position);
    if (nodeTarget) {
      return nodeTarget;
    }

    return this.tryBuildJumpTarget(lineContent, position);
  }

  static tryBuildQueryTarget(lineContent, position) {
    const pattern = /\[([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\]/g;
    let match = pattern.exec(lineContent);
    while (match) {
      const startColumn = match.index + 2;
      const endColumn = startColumn + match[1].length;
      if (position.column >= startColumn && position.column <= endColumn) {
        return {
          kind: "query",
          name: match[1],
          startColumn,
          endColumn,
        };
      }

      match = pattern.exec(lineContent);
    }

    return null;
  }

  static tryBuildHostEventTarget(lineContent, position) {
    const match = /^(\s*@emit(?::|\s+)\s*)([A-Za-z_][A-Za-z0-9_.-]*)/.exec(lineContent);
    if (!match) {
      return null;
    }

    const startColumn = match[1].length + 1;
    const endColumn = startColumn + match[2].length;
    if (position.column < startColumn || position.column > endColumn) {
      return null;
    }

    return {
      kind: "host-event",
      name: match[2],
      startColumn,
      endColumn,
    };
  }

  static tryBuildHostBindingTarget(lineContent, position) {
    const match = /^(\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*)([^\s\]]+)/.exec(lineContent);
    if (!match) {
      return null;
    }

    const startColumn = match[1].length + 1;
    const endColumn = startColumn + match[2].length;
    if (position.column < startColumn || position.column > endColumn) {
      return null;
    }

    return {
      bindingKind: "timeline",
      kind: "host-binding",
      name: match[2],
      startColumn,
      endColumn,
    };
  }

  static tryBuildSpeakerTarget(lineContent, position) {
    const match = /^(\s*)([^#@\-\?\[\]\s][^:：]{0,80}?)[ \t]*[:：]/.exec(lineContent);
    if (!match) {
      return null;
    }

    const name = match[2].trim();
    if (!name) {
      return null;
    }

    const trimOffset = match[2].indexOf(name);
    const startColumn = match[1].length + trimOffset + 1;
    const endColumn = startColumn + name.length;
    if (position.column < startColumn || position.column > endColumn) {
      return null;
    }

    return {
      kind: "speaker",
      name,
      startColumn,
      endColumn,
    };
  }

  static tryBuildNodeTarget(lineContent, position) {
    const leadingWhitespaceLength = lineContent.length - lineContent.trimStart().length;
    const trimmed = lineContent.trim();
    if (!trimmed.startsWith("# ")) {
      return null;
    }

    const titleStartColumn = leadingWhitespaceLength + 3;
    const title = trimmed.slice(2).trim();
    if (!title) {
      return null;
    }

    const titleEndColumn = titleStartColumn + title.length;
    if (position.column < titleStartColumn || position.column > titleEndColumn) {
      return null;
    }

    return {
      kind: "node",
      name: title,
      startColumn: titleStartColumn,
      endColumn: titleEndColumn,
    };
  }

  static tryBuildJumpTarget(lineContent, position) {
    const arrowIndex = lineContent.indexOf("->");
    if (arrowIndex < 0) {
      return null;
    }

    const targetSlice = lineContent.slice(arrowIndex + 2);
    const targetTrimmedStart = targetSlice.search(/\S/);
    if (targetTrimmedStart < 0) {
      return null;
    }

    const targetName = targetSlice.slice(targetTrimmedStart).trim();
    if (!targetName) {
      return null;
    }

    const startColumn = arrowIndex + 3 + targetTrimmedStart;
    const endColumn = startColumn + targetName.length;
    if (position.column < startColumn || position.column > endColumn) {
      return null;
    }

    return {
      kind: "jump",
      name: targetName,
      startColumn,
      endColumn,
    };
  }
}
