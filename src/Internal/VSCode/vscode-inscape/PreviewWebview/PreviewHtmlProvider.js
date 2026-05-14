"use strict";

class PreviewHtmlProvider {

    createLoadingHtml(workspaceName) {
        return [
            "<!DOCTYPE html>",
            "<html lang=\"zh-CN\">",
            "<head>",
            "  <meta charset=\"utf-8\" />",
            "  <title>Inscape Preview</title>",
            "  <style>",
            "    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; }",
            "    .card { max-width: 640px; border: 1px solid var(--vscode-panel-border); border-radius: 10px; padding: 16px 18px; background: var(--vscode-sideBar-background); }",
            "    h1 { font-size: 18px; margin: 0 0 8px; }",
            "    p { margin: 0; opacity: 0.85; line-height: 1.5; }",
            "  </style>",
            "</head>",
            "<body>",
            "  <div class=\"card\">",
            "    <h1>正在生成预览</h1>",
            "    <p>工作区：" + this.escapeHtml(workspaceName) + "</p>",
            "  </div>",
            "</body>",
            "</html>"
        ].join("\n");
    }

    createErrorHtml(message) {
        return [
            "<!DOCTYPE html>",
            "<html lang=\"zh-CN\">",
            "<head>",
            "  <meta charset=\"utf-8\" />",
            "  <title>Inscape Preview Error</title>",
            "  <style>",
            "    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; }",
            "    .card { max-width: 760px; border: 1px solid var(--vscode-errorForeground); border-radius: 10px; padding: 16px 18px; background: var(--vscode-inputValidation-errorBackground); }",
            "    h1 { font-size: 18px; margin: 0 0 8px; color: var(--vscode-errorForeground); }",
            "    pre { white-space: pre-wrap; margin: 0; line-height: 1.5; }",
            "  </style>",
            "</head>",
            "<body>",
            "  <div class=\"card\">",
            "    <h1>预览生成失败</h1>",
            "    <pre>" + this.escapeHtml(message) + "</pre>",
            "  </div>",
            "</body>",
            "</html>"
        ].join("\n");
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;");
    }

}

module.exports = {
    PreviewHtmlProvider
};
