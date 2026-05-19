"use strict";

class PreviewRevealBridge {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.previewPanels = dependencies.previewPanels;
        this.refreshPreviewPanel = dependencies.refreshPreviewPanel;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.normalizePath = dependencies.normalizePath;
        this.isLikelyDialogueSpeaker = dependencies.isLikelyDialogueSpeaker;
        this.findDialogueSeparatorIndex = dependencies.findDialogueSeparatorIndex;
        this.trimRange = dependencies.trimRange;
        this.getSourceSyncMode = dependencies.getSourceSyncMode;
        this.pendingReveals = new Map();
        this.pendingDefinition = undefined;
        this.selectionSyncTimers = new Map();
        this.lastSelectionSyncBySource = new Map();
    }

    rememberDefinition(document, previewRevealInfo) {
        this.pendingDefinition = {
            sourceKey: this.normalizePath(document.uri.fsPath),
            range: previewRevealInfo.range,
            payload: previewRevealInfo.payload,
            expiresAt: Date.now() + 1500
        };
    }

    getRevealInfoAtPosition(document, position) {
        if (!this.isInscapeDocument(document) || position.line < 0 || position.line >= document.lineCount) {
            return undefined;
        }

        const range = this.getRevealRangeForLine(document.lineAt(position.line).text);
        if (!range || position.character < range.start || position.character >= range.end) {
            return undefined;
        }

        const revealRange = new this.vscode.Range(position.line, range.start, position.line, range.end);
        return {
            range: revealRange,
            payload: {
                sourcePath: document.uri.fsPath,
                line: position.line,
                character: typeof range.payloadCharacter === "number" ? range.payloadCharacter : range.start,
                length: range.end - range.start
            }
        };
    }

    getRevealRangeForLine(line) {
        if (!line || !line.trim()) {
            return undefined;
        }

        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("@") || trimmed.startsWith("->")) {
            return undefined;
        }

        const speakerMatch = /^\s*([^:\uFF1A]+?)[ \t]*[:\uFF1A](.*)$/.exec(line);
        if (speakerMatch && this.isLikelyDialogueSpeaker(speakerMatch[1].trim())) {
            const colonIndex = this.findDialogueSeparatorIndex(line);
            return this.trimRange(line, colonIndex + 1, line.length);
        }

        const choicePromptMatch = /^(\s*\?\s*)(.*)$/.exec(line);
        if (choicePromptMatch) {
            const promptRange = this.trimRange(line, choicePromptMatch[1].length, line.length);
            if (!promptRange) {
                return undefined;
            }

            return {
                start: promptRange.start,
                end: promptRange.end,
                payloadCharacter: this.trimRange(line, choicePromptMatch[1].length, line.length)?.start ?? promptRange.start
            };
        }

        const choiceOptionMatch = /^(\s*-\s*)(.*)$/.exec(line);
        if (choiceOptionMatch) {
            const optionStart = choiceOptionMatch[1].length;
            const targetIndex = line.indexOf("->", optionStart);
            const optionEnd = targetIndex >= 0 ? targetIndex : line.length;
            const displayRange = this.trimRange(line, optionStart, optionEnd);
            if (!displayRange) {
                return undefined;
            }

            return {
                start: displayRange.start,
                end: displayRange.end,
                payloadCharacter: this.trimRange(line, optionStart, optionEnd)?.start ?? displayRange.start
            };
        }

        if (/^\s*\[[^\]]+\]\s*$/.test(line)) {
            return undefined;
        }

        return this.trimRange(line, 0, line.length);
    }

    createDefinitionLink(document, previewRevealInfo) {
        return {
            originSelectionRange: previewRevealInfo.range,
            targetUri: document.uri,
            targetRange: previewRevealInfo.range,
            targetSelectionRange: previewRevealInfo.range
        };
    }

    shouldProvideClickReveal(document) {
        return this.getSyncMode(document) !== "off";
    }

    async reveal(context, payload) {
        if (!payload || !payload.sourcePath) {
            return;
        }

        try {
            const document = await this.vscode.workspace.openTextDocument(this.vscode.Uri.file(payload.sourcePath));
            if (!this.isInscapeDocument(document)) {
                return;
            }

            this.queue(document, payload);
            await this.vscode.commands.executeCommand("vscode.openWith", document.uri, "inscape.preview", {
                viewColumn: this.vscode.ViewColumn.Beside,
                preserveFocus: false,
                preview: false
            });
            await this.revealOpenPanels(context, document, payload);
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        }
    }

    async handleSelectionChange(context, event) {
        if (!event || !event.textEditor || !event.selections || event.selections.length === 0) {
            return;
        }

        const document = event.textEditor.document;
        if (!this.isInscapeDocument(document)) {
            return;
        }

        const syncMode = this.getSyncMode(document);
        const pending = this.pendingDefinition;
        if (!pending || pending.expiresAt < Date.now()) {
            this.pendingDefinition = undefined;
        } else {
            if (this.normalizePath(document.uri.fsPath) !== pending.sourceKey) {
                return;
            }

            const kind = event.kind;
            if (kind === this.vscode.TextEditorSelectionChangeKind.Keyboard) {
                return;
            }

            const active = event.selections[0].active;
            if (!pending.range.contains(active)) {
                return;
            }

            this.pendingDefinition = undefined;
            if (syncMode === "off") {
                return;
            }

            await this.reveal(context, pending.payload);
            return;
        }

        if (syncMode !== "selection") {
            return;
        }

        const selection = event.selections[0];
        if (!selection) {
            return;
        }

        this.scheduleSelectionSync(document, selection);
    }

    queue(document, payload) {
        this.pendingReveals.set(this.normalizePath(document.uri.fsPath), {
            sourcePath: payload.sourcePath,
            line: Math.max(0, payload.line || 0),
            character: Math.max(0, payload.character || 0),
            length: Math.max(0, payload.length || 0)
        });
    }

    async revealOpenPanels(context, document, payload) {
        const panels = this.previewPanels.get(this.normalizePath(document.uri.fsPath));
        if (!panels || panels.size === 0) {
            return false;
        }

        for (const panel of panels) {
            await this.refreshPreviewPanel(context, panel, document, false);
            this.postMessage(panel, payload);
        }

        this.pendingReveals.delete(this.normalizePath(document.uri.fsPath));
        return true;
    }

    revealExistingPanels(document, payload) {
        const panels = this.previewPanels.get(this.normalizePath(document.uri.fsPath));
        if (!panels || panels.size === 0) {
            return false;
        }

        for (const panel of panels) {
            this.postMessage(panel, payload);
        }

        return true;
    }

    applyPending(panel, document) {
        const key = this.normalizePath(document.uri.fsPath);
        const payload = this.pendingReveals.get(key);
        if (!payload) {
            return false;
        }

        this.postMessage(panel, payload);
        this.pendingReveals.delete(key);
        return true;
    }

    postMessage(panel, payload) {
        setTimeout(() => {
            panel.webview.postMessage({
                type: "revealSource",
                source: {
                    sourcePath: payload.sourcePath,
                    line: Math.max(0, payload.line || 0),
                    character: Math.max(0, payload.character || 0),
                    length: Math.max(0, payload.length || 0)
                }
            });
        }, 30);
    }

    scheduleSelectionSync(document, selection) {
        if (!this.hasOpenPanels(document)) {
            return;
        }

        const sourceKey = this.normalizePath(document.uri.fsPath);
        const payload = {
            sourcePath: document.uri.fsPath,
            line: selection.start.line,
            character: selection.start.character,
            length: selection.start.line === selection.end.line
                ? Math.max(0, selection.end.character - selection.start.character)
                : 0
        };

        const previousPayload = this.lastSelectionSyncBySource.get(sourceKey);
        if (previousPayload
            && previousPayload.line === payload.line
            && previousPayload.character === payload.character
            && previousPayload.length === payload.length) {
            return;
        }

        const existing = this.selectionSyncTimers.get(sourceKey);
        if (existing) {
            clearTimeout(existing);
        }

        this.selectionSyncTimers.set(sourceKey, setTimeout(() => {
            this.selectionSyncTimers.delete(sourceKey);
            this.lastSelectionSyncBySource.set(sourceKey, payload);
            this.revealExistingPanels(document, payload);
        }, 120));
    }

    hasOpenPanels(document) {
        const panels = this.previewPanels.get(this.normalizePath(document.uri.fsPath));
        return !!panels && panels.size > 0;
    }

    getSyncMode(document) {
        const raw = this.getSourceSyncMode ? this.getSourceSyncMode(document) : "click";
        if (raw === "off" || raw === "selection") {
            return raw;
        }

        return "click";
    }

}

module.exports = {
    PreviewRevealBridge
};
