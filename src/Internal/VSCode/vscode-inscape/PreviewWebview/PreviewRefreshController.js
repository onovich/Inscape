"use strict";

class PreviewRefreshController {

    constructor(dependencies) {
        this.fs = dependencies.fs;
        this.vscode = dependencies.vscode;
        this.previewPanels = dependencies.previewPanels;
        this.previewHtmlProvider = dependencies.previewHtmlProvider;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.normalizePath = dependencies.normalizePath;
        this.hashDocumentText = dependencies.hashDocumentText;
        this.writeTempDocument = dependencies.writeTempDocument;
        this.createTempPath = dependencies.createTempPath;
        this.createPreviewInvocation = dependencies.createPreviewInvocation;
        this.execFileDetailedPromise = dependencies.execFileDetailedPromise;
        this.getInvocationFailureDetail = dependencies.getInvocationFailureDetail;
        this.logOutput = dependencies.logOutput;
        this.refreshTimers = new Map();
        this.renderCache = new Map();
        this.renderVersions = new Map();
    }

    async refreshPanelsForDocument(context, document) {
        if (!this.isInscapeDocument(document)) {
            return;
        }

        const panels = this.previewPanels.get(this.normalizePath(document.uri.fsPath));
        if (!panels || panels.size === 0) {
            return;
        }

        for (const panel of panels) {
            await this.refreshPanel(context, panel, document, false);
        }
    }

    scheduleRefresh(context, document, delayOverride) {
        if (!this.isInscapeDocument(document)) {
            return;
        }

        const sourceKey = this.normalizePath(document.uri.fsPath);
        const panels = this.previewPanels.get(sourceKey);
        if (!panels || panels.size === 0) {
            return;
        }

        const existing = this.refreshTimers.get(sourceKey);
        if (existing) {
            clearTimeout(existing);
        }

        const delay = typeof delayOverride === "number" ? delayOverride : 250;
        this.refreshTimers.set(sourceKey, setTimeout(() => {
            this.refreshTimers.delete(sourceKey);
            this.refreshPanelsForDocument(context, document);
        }, delay));
    }

    async refreshPanel(context, panel, document, showProgress) {
        const runRefresh = async () => {
            const cacheKey = this.normalizePath(document.uri.fsPath);
            const documentHash = this.hashDocumentText(document);
            const cached = this.renderCache.get(cacheKey);
            if (cached && cached.documentHash === documentHash && cached.html) {
                panel.webview.html = cached.html;
                return;
            }

            const version = (this.renderVersions.get(cacheKey) || 0) + 1;
            this.renderVersions.set(cacheKey, version);

            let tempPath;
            const outputPath = this.createTempPath("preview", ".html");

            try {
                if (document && this.isInscapeDocument(document)) {
                    tempPath = this.writeTempDocument(document);
                }

                const invocation = this.createPreviewInvocation(context, document, tempPath, outputPath);
                const result = await this.execFileDetailedPromise(invocation);

                if (this.renderVersions.get(cacheKey) !== version) {
                    return;
                }

                const hasOutput = this.fs.existsSync(outputPath);

                if (!hasOutput) {
                    throw new Error(this.getInvocationFailureDetail(result.stderr, result.stdout, "Preview HTML was not generated."));
                }

                const html = await this.fs.promises.readFile(outputPath, "utf8");
                this.renderCache.set(cacheKey, {
                    documentHash,
                    html
                });
                panel.webview.html = html;

                if (result.exitCode !== 0) {
                    const detail = this.getInvocationFailureDetail(result.stderr, result.stdout, "Preview rendered with compiler diagnostics.");
                    this.logOutput("Preview rendered with diagnostics for " + document.uri.fsPath + ": " + detail);
                    if (showProgress) {
                        this.vscode.window.showWarningMessage("Inscape preview已刷新，但包含编译诊断。详情见 Problems 或输出面板。");
                    }
                }
            } finally {
                if (tempPath) {
                    this.fs.unlink(tempPath, () => { });
                }

                this.fs.unlink(outputPath, () => { });
            }
        };

        try {
            if (showProgress) {
                await this.vscode.window.withProgress({
                    location: this.vscode.ProgressLocation.Notification,
                    title: "Opening Inscape preview",
                    cancellable: false
                }, runRefresh);
            } else {
                await runRefresh();
            }
        } catch (error) {
            this.logOutput("Preview refresh failed: " + (error.message || String(error)));
            panel.webview.html = this.previewHtmlProvider.createErrorHtml(error.message || String(error));
            this.vscode.window.showErrorMessage(error.message || String(error));
        }
    }

}

module.exports = {
    PreviewRefreshController
};
