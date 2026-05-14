"use strict";

class PreviewSourceController {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.normalizePath = dependencies.normalizePath;
        this.openLocation = dependencies.openLocation;
    }

    async openSource(source, webviewPanel) {
        try {
            const location = new this.vscode.Location(
                this.vscode.Uri.file(source.sourcePath),
                new this.vscode.Range(
                    Math.max(0, (source.line || 0)),
                    Math.max(0, (source.column || 0)),
                    Math.max(0, (source.line || 0)),
                    Math.max(0, (source.column || 0) + 1)
                )
            );

            const existingEditor = this.findVisibleTextEditorForUri(location.uri, webviewPanel);
            if (existingEditor) {
                await this.focusExistingTextEditor(existingEditor, location.range);
                return;
            }

            await this.openLocation(location, {
                viewColumn: this.resolveSourceViewColumn(location.uri, webviewPanel)
            });
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        }
    }

    async focusExistingTextEditor(editor, range) {
        const activatedEditor = await this.vscode.window.showTextDocument(editor.document, {
            viewColumn: editor.viewColumn,
            preview: false,
            preserveFocus: false,
            selection: range
        });
        activatedEditor.selection = new this.vscode.Selection(range.start, range.end);
        activatedEditor.revealRange(range, this.vscode.TextEditorRevealType.InCenter);
    }

    findVisibleTextEditorForUri(targetUri, webviewPanel) {
        const targetPath = this.normalizePath(targetUri.fsPath);
        const exactMatch = this.vscode.window.visibleTextEditors.find((editor) => this.normalizePath(editor.document.uri.fsPath) === targetPath);
        if (exactMatch) {
            return exactMatch;
        }

        if (!webviewPanel) {
            return undefined;
        }

        return this.vscode.window.visibleTextEditors.find((editor) => editor.viewColumn && editor.viewColumn !== webviewPanel.viewColumn);
    }

    resolveSourceViewColumn(targetUri, webviewPanel) {
        const visibleEditor = this.vscode.window.visibleTextEditors.find((editor) => this.normalizePath(editor.document.uri.fsPath) === this.normalizePath(targetUri.fsPath));
        if (visibleEditor && visibleEditor.viewColumn) {
            return visibleEditor.viewColumn;
        }

        const openTabColumn = this.findOpenTextTabViewColumn(targetUri);
        if (openTabColumn) {
            return openTabColumn;
        }

        const fallbackEditor = this.vscode.window.visibleTextEditors.find((editor) => editor.viewColumn && (!webviewPanel || editor.viewColumn !== webviewPanel.viewColumn));
        if (fallbackEditor && fallbackEditor.viewColumn) {
            return fallbackEditor.viewColumn;
        }

        if (webviewPanel && typeof webviewPanel.viewColumn === "number") {
            return webviewPanel.viewColumn > 1 ? webviewPanel.viewColumn - 1 : this.vscode.ViewColumn.Beside;
        }

        return this.vscode.ViewColumn.Beside;
    }

    findOpenTextTabViewColumn(targetUri) {
        const targetPath = this.normalizePath(targetUri.fsPath);
        for (const group of this.vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                const input = tab.input;
                if (!input || !input.uri || input.viewType === "inscape.preview") {
                    continue;
                }

                if (this.normalizePath(input.uri.fsPath) === targetPath && group.viewColumn) {
                    return group.viewColumn;
                }
            }
        }

        return undefined;
    }

}

module.exports = {
    PreviewSourceController
};
