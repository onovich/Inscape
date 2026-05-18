"use strict";

class PreviewCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.previewRevealBridge = dependencies.previewRevealBridge;
        this.normalizePath = dependencies.normalizePath;
    }

    async open() {
        const document = await this.resolveDocument();
        if (!document) {
            return;
        }

        await this.openDocument(document);
    }

    async toggle() {
        const document = await this.resolveDocument();
        if (!document) {
            return;
        }

        const openPreviewTab = this.findTab(document);
        if (openPreviewTab && this.isActiveTab(openPreviewTab, document)) {
            await this.vscode.window.tabGroups.close(openPreviewTab, true);
            return;
        }

        await this.openDocument(document);
    }

    async revealSelection(context) {
        const editor = this.vscode.window.activeTextEditor;
        if (!editor || !this.isInscapeDocument(editor.document)) {
            this.vscode.window.showWarningMessage("Open an .inscape file before revealing preview.");
            return;
        }

        const selection = editor.selection;
        const start = selection ? selection.start : new this.vscode.Position(0, 0);
        const end = selection ? selection.end : start;
        const payload = {
            sourcePath: editor.document.uri.fsPath,
            line: start.line,
            character: start.character,
            length: start.line === end.line ? Math.max(0, end.character - start.character) : 0
        };

        await this.previewRevealBridge.reveal(context, payload);
    }

    async openDocument(document) {
        await this.vscode.commands.executeCommand("vscode.openWith", document.uri, "inscape.preview", {
            viewColumn: this.vscode.ViewColumn.Beside,
            preserveFocus: false,
            preview: false
        });
    }

    async resolveDocument() {
        const activeDocument = this.vscode.window.activeTextEditor ? this.vscode.window.activeTextEditor.document : undefined;
        if (activeDocument && this.isInscapeDocument(activeDocument)) {
            return activeDocument;
        }

        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return undefined;
        }

        const candidates = await this.vscode.workspace.findFiles("**/*.inscape", "{**/.git/**,**/bin/**,**/obj/**,**/node_modules/**,**/artifacts/**}", 1);
        if (candidates.length === 0) {
            this.vscode.window.showWarningMessage("Open an .inscape file before opening the Inscape preview.");
            return undefined;
        }

        return this.vscode.workspace.openTextDocument(candidates[0]);
    }

    findTab(document) {
        const targetPath = this.normalizePath(document.uri.fsPath);
        for (const group of this.vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                const input = tab.input;
                if (!input || input.viewType !== "inscape.preview" || !input.uri) {
                    continue;
                }

                if (this.normalizePath(input.uri.fsPath) === targetPath) {
                    return tab;
                }
            }
        }

        return undefined;
    }

    isActiveTab(tab, document) {
        const activeTab = this.vscode.window.tabGroups.activeTabGroup.activeTab;
        if (!activeTab || activeTab !== tab) {
            return false;
        }

        const input = tab.input;
        return input
            && input.viewType === "inscape.preview"
            && input.uri
            && this.normalizePath(input.uri.fsPath) === this.normalizePath(document.uri.fsPath);
    }

}

module.exports = {
    PreviewCommand
};
