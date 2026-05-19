"use strict";

class PreviewEditorProvider {

    constructor(dependencies) {
        this.path = dependencies.path;
        this.context = dependencies.context;
        this.previewPanels = dependencies.previewPanels;
        this.normalizePath = dependencies.normalizePath;
        this.createPreviewLoadingHtml = dependencies.createPreviewLoadingHtml;
        this.refreshPreviewPanel = dependencies.refreshPreviewPanel;
        this.previewRevealBridge = dependencies.previewRevealBridge;
        this.openPreviewSource = dependencies.openPreviewSource;
    }

    resolveCustomTextEditor(document, webviewPanel) {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        const sourceKey = this.normalizePath(document.uri.fsPath);
        if (!this.previewPanels.has(sourceKey)) {
            this.previewPanels.set(sourceKey, new Set());
        }

        const panels = this.previewPanels.get(sourceKey);
        panels.add(webviewPanel);

        webviewPanel.title = "Inscape Preview · " + this.path.basename(document.uri.fsPath);
        webviewPanel.webview.html = this.createPreviewLoadingHtml(this.path.basename(document.uri.fsPath));

        webviewPanel.onDidDispose(() => {
            const currentPanels = this.previewPanels.get(sourceKey);
            if (!currentPanels) {
                return;
            }

            currentPanels.delete(webviewPanel);
            if (currentPanels.size === 0) {
                this.previewPanels.delete(sourceKey);
            }
        });

        webviewPanel.webview.onDidReceiveMessage((message) => {
            if (!message || message.type !== "openSource" || !message.source || !message.source.sourcePath) {
                return;
            }

            this.openPreviewSource(message.source, webviewPanel);
        });

        this.refreshPreviewPanel(this.context, webviewPanel, document, true)
            .then(() => this.previewRevealBridge.applyPending(webviewPanel, document));
    }

}

module.exports = {
    PreviewEditorProvider
};
