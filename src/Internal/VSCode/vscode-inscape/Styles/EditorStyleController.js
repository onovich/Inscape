const { defaultEditorStyle } = require("./StyleDefaults");

class EditorStyleController {
    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.readProjectConfig = dependencies.readProjectConfig;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.isLikelyDialogueSpeaker = dependencies.isLikelyDialogueSpeaker;
        this.findDialogueSeparatorIndex = dependencies.findDialogueSeparatorIndex;
        this.trimRange = dependencies.trimRange;
        this.styleStates = new Map();
        this.styleFileNames = new Set(["inscape.config.json", "inscape.editor-style.json", "inscape.preview-style.json"]);
    }

    handleStyleDocumentSave(context, document, refreshPreviewPanels) {
        if (!document || document.uri.scheme !== "file") {
            return;
        }

        const fileName = this.pathBasename(document.uri.fsPath).toLowerCase();
        if (!this.styleFileNames.has(fileName)) {
            return;
        }

        this.refreshVisibleEditors(context);
        refreshPreviewPanels(context);
    }

    refreshVisibleEditors(context) {
        for (const editor of this.vscode.window.visibleTextEditors) {
            this.applyStyleSheet(context, editor);
        }
    }

    refreshDocument(context, document) {
        if (!document || document.uri.scheme !== "file") {
            return;
        }

        for (const editor of this.vscode.window.visibleTextEditors) {
            if (this.normalizePath(editor.document.uri.fsPath) === this.normalizePath(document.uri.fsPath)) {
                this.applyStyleSheet(context, editor);
            }
        }
    }

    async applyStyleSheet(context, editor) {
        this.clearStyleState(editor);

        if (!editor || !this.isInscapeDocument(editor.document)) {
            return;
        }

        const style = await this.readStyleSheet(editor.document);
        const ranges = this.collectStyleRanges(editor.document);
        const entries = this.createStyleEntries(style);
        const key = this.getStyleStateKey(editor);
        this.styleStates.set(key, entries);

        for (const entry of entries) {
            editor.setDecorations(entry.decoration, ranges[entry.key] || []);
        }
    }

    getStyleStateKey(editor) {
        return editor.document.uri.toString() + "::" + String(editor.viewColumn || 0);
    }

    clearStyleState(editor) {
        const key = this.getStyleStateKey(editor);
        const existing = this.styleStates.get(key);
        if (!existing) {
            return;
        }

        this.styleStates.delete(key);
        for (const entry of existing) {
            entry.decoration.dispose();
        }
    }

    async readStyleSheet(document) {
        const projectConfig = await this.readProjectConfig(document);
        const configuredPath = projectConfig && projectConfig.config && projectConfig.config.styles
            ? projectConfig.config.styles.editor
            : undefined;

        if (!projectConfig || !projectConfig.configPath || !configuredPath) {
            return Object.assign({}, defaultEditorStyle);
        }

        const stylePath = this.resolveProjectConfigPath(projectConfig.configPath, configuredPath);
        try {
            const text = await this.fs.promises.readFile(stylePath, "utf8");
            return this.normalizeStyleSheet(JSON.parse(text));
        } catch {
            return Object.assign({}, defaultEditorStyle);
        }
    }

    normalizeStyleSheet(value) {
        const style = Object.assign({}, defaultEditorStyle);
        if (!value || typeof value !== "object") {
            return style;
        }

        for (const key of Object.keys(defaultEditorStyle)) {
            if (typeof value[key] === "string" && value[key].trim()) {
                style[key] = value[key].trim();
            }
        }

        return style;
    }

    createStyleEntries(style) {
        return [
            this.createStyleEntry("nodeName", { color: style.nodeNameColor }),
            this.createStyleEntry("jumpTarget", { color: style.jumpTargetColor }),
            this.createStyleEntry("metadata", { color: style.metadataColor }),
            this.createStyleEntry("inlineTag", { color: style.inlineTagColor })
        ];
    }

    createStyleEntry(key, options) {
        return {
            key,
            decoration: this.vscode.window.createTextEditorDecorationType(options)
        };
    }

    collectStyleRanges(document) {
        const ranges = {
            nodeName: [],
            speaker: [],
            dialogue: [],
            narration: [],
            choicePrompt: [],
            choiceText: [],
            jumpTarget: [],
            metadata: [],
            inlineTag: []
        };

        for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
            const text = document.lineAt(lineNumber).text;
            if (!text || !text.trim() || /^\s*\/\//.test(text)) {
                continue;
            }

            let match = /^(\s*)(#)(\s*)(\S(?:.*\S)?)\s*$/.exec(text);
            if (match) {
                this.pushStyleRange(ranges.nodeName, lineNumber, match.index + match[1].length + match[2].length + match[3].length, match[4].length);
                continue;
            }

            match = /^(\s*)(@)([A-Za-z_][A-Za-z0-9_.-]*)(?:((?::|\s+).*))?$/.exec(text);
            if (match) {
                this.pushTrimmedRange(ranges.metadata, lineNumber, text, 0, text.length);
                continue;
            }

            if (/^\s*\[[^\]\r\n]*\]\s*$/.test(text)) {
                this.pushTrimmedRange(ranges.inlineTag, lineNumber, text, 0, text.length);
                continue;
            }

            match = /^(\s*)(->)(\s*)([^/\\\r\n]*\S[^/\\\r\n]*)\s*$/.exec(text);
            if (match) {
                this.pushStyleRange(ranges.jumpTarget, lineNumber, match.index + match[1].length + match[2].length + match[3].length, match[4].length);
                continue;
            }

            match = /^(\s*\?\s*)(.*)$/.exec(text);
            if (match) {
                this.pushTrimmedRange(ranges.choicePrompt, lineNumber, text, match[1].length, text.length);
                continue;
            }

            match = /^(\s*-\s*)(.*?)(\s+->\s*[A-Za-z0-9_.-]+)?\s*$/.exec(text);
            if (match) {
                this.pushTrimmedRange(ranges.choiceText, lineNumber, text, match[1].length, match[1].length + match[2].length);
                const targetIndex = text.indexOf("->", match[1].length);
                if (targetIndex >= 0) {
                    this.pushTrimmedRange(ranges.jumpTarget, lineNumber, text, targetIndex + 2, text.length);
                }
                continue;
            }

            const dialogueSeparator = this.findDialogueSeparatorIndex(text);
            if (dialogueSeparator >= 0) {
                const speakerRange = this.trimRange(text, 0, dialogueSeparator);
                const dialogueRange = this.trimRange(text, dialogueSeparator + 1, text.length);
                if (speakerRange && this.isLikelyDialogueSpeaker(text.slice(speakerRange.start, speakerRange.end))) {
                    ranges.speaker.push(new this.vscode.Range(lineNumber, speakerRange.start, lineNumber, speakerRange.end));
                    if (dialogueRange) {
                        ranges.dialogue.push(new this.vscode.Range(lineNumber, dialogueRange.start, lineNumber, dialogueRange.end));
                    }
                    continue;
                }
            }

            this.pushTrimmedRange(ranges.narration, lineNumber, text, 0, text.length);
        }

        return ranges;
    }

    pushStyleRange(bucket, lineNumber, start, length) {
        if (length <= 0) {
            return;
        }

        bucket.push(new this.vscode.Range(lineNumber, start, lineNumber, start + length));
    }

    pushTrimmedRange(bucket, lineNumber, text, start, end) {
        const range = this.trimRange(text, start, end);
        if (!range) {
            return;
        }

        bucket.push(new this.vscode.Range(lineNumber, range.start, lineNumber, range.end));
    }

    normalizePath(filePath) {
        return filePath.replace(/\\/g, "/").toLowerCase();
    }

    pathBasename(filePath) {
        const normalized = filePath.replace(/\\/g, "/");
        const index = normalized.lastIndexOf("/");
        return index >= 0 ? normalized.slice(index + 1) : normalized;
    }
}

module.exports = {
    EditorStyleController
};
