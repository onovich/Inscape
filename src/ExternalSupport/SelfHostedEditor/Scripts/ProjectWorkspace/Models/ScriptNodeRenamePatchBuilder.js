export class ScriptNodeRenamePatchBuilder {
  static build(scriptText, oldTitle, newTitle) {
    const normalizedOldTitle = oldTitle.trim();
    const normalizedNewTitle = newTitle.trim();
    if (!normalizedOldTitle || !normalizedNewTitle || normalizedOldTitle === normalizedNewTitle) {
      return {
        changedLineNumbers: [],
        text: scriptText,
      };
    }

    const changedLineNumbers = [];
    const nextLines = scriptText.split(/\r?\n/).map((line, index) => {
      const lineNumber = index + 1;
      const renamedTitleLine = this.renameTitleLine(line, normalizedOldTitle, normalizedNewTitle);
      if (renamedTitleLine !== line) {
        changedLineNumbers.push(lineNumber);
        return renamedTitleLine;
      }

      const renamedJumpLine = this.renameJumpTargetLine(line, normalizedOldTitle, normalizedNewTitle);
      if (renamedJumpLine !== line) {
        changedLineNumbers.push(lineNumber);
      }
      return renamedJumpLine;
    });

    return {
      changedLineNumbers,
      text: nextLines.join("\n"),
    };
  }

  static renameTitleLine(line, oldTitle, newTitle) {
    const match = line.match(/^(\s*#\s+)(.*?)(\s*)$/);
    if (!match || match[2].trim() !== oldTitle) {
      return line;
    }

    return `${match[1]}${newTitle}${match[3]}`;
  }

  static renameJumpTargetLine(line, oldTitle, newTitle) {
    const arrowIndex = line.indexOf("->");
    if (arrowIndex < 0) {
      return line;
    }

    const beforeArrow = line.slice(0, arrowIndex + 2);
    const afterArrow = line.slice(arrowIndex + 2);
    const trailingWhitespace = afterArrow.match(/\s*$/)?.[0] || "";
    const target = afterArrow.trim();
    if (target !== oldTitle) {
      return line;
    }

    return `${beforeArrow} ${newTitle}${trailingWhitespace}`;
  }
}

