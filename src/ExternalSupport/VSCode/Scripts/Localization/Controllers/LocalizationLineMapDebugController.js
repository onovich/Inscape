"use strict";

class LocalizationLineMapDebugController {

    constructor(dependencies) {
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.readProjectConfig = dependencies.readProjectConfig;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.normalizePath = dependencies.normalizePath;
        this.cache = new Map();
    }

    async tryCreateHover(document, position) {
        const lineMap = await this.readLineMap(document);
        if (!lineMap) {
            return undefined;
        }

        const block = this.findBlockForLine(lineMap, document.uri.fsPath, position.line + 1);
        if (!block) {
            return undefined;
        }

        const entry = block.lines.find((line) => Number(line.lineNumber || 0) === position.line + 1);
        if (!entry) {
            return undefined;
        }

        const textLine = document.lineAt(position.line).text;
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Debug**\n\n");
        markdown.appendMarkdown("blockId: `" + String(block.blockId || "") + "`\n\n");
        markdown.appendMarkdown("lineId: `" + String(entry.lineId || "") + "`\n\n");
        markdown.appendMarkdown("lineNumber: `" + String(entry.lineNumber || position.line + 1) + "`\n\n");
        markdown.appendMarkdown("kind: `" + String(entry.kind || "") + "`\n\n");
        if (entry.speaker) {
            markdown.appendMarkdown("speaker: `" + String(entry.speaker) + "`\n\n");
        }
        markdown.appendMarkdown("raw: `" + textLine.replace(/`/g, "\\`") + "`");
        return new this.vscode.Hover(markdown, new this.vscode.Range(position.line, 0, position.line, textLine.length));
    }

    async readLineMap(document) {
        const config = await this.readProjectConfig(document);
        const lineMapPath = config && config.config && config.config.localization && config.config.localization.lineMap
            ? this.resolveProjectConfigPath(config.configPath, config.config.localization.lineMap)
            : this.path.join(this.workspaceRoot(document), "inscape.line-map.json");
        const cacheKey = this.normalizePath(lineMapPath);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        if (!this.fs.existsSync(lineMapPath)) {
            this.cache.set(cacheKey, undefined);
            return undefined;
        }

        try {
            const text = await this.fs.promises.readFile(lineMapPath, "utf8");
            const parsed = JSON.parse(text);
            this.cache.set(cacheKey, parsed);
            return parsed;
        } catch {
            this.cache.set(cacheKey, undefined);
            return undefined;
        }
    }

    findBlockForLine(lineMap, sourcePath, lineNumber) {
        const normalizedSource = this.normalizeDocumentPath(sourcePath);
        const documents = Array.isArray(lineMap && lineMap.documents) ? lineMap.documents : [];
        for (let i = 0; i < documents.length; i += 1) {
            const document = documents[i];
            if (this.normalizeDocumentPath(document.sourcePath) !== normalizedSource) {
                continue;
            }

            const blocks = Array.isArray(document.blocks) ? document.blocks : [];
            for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
                const block = blocks[blockIndex];
                const lines = Array.isArray(block.lines) ? block.lines : [];
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
                    if (Number(lines[lineIndex].lineNumber || 0) === lineNumber) {
                        return block;
                    }
                }
            }
        }

        return undefined;
    }

    normalizeDocumentPath(sourcePath) {
        return this.normalizePath(String(sourcePath || "").replace(/\\/g, "/"));
    }

    workspaceRoot(document) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (folder) {
            return folder.uri.fsPath;
        }

        return this.path.dirname(document.uri.fsPath);
    }

}

module.exports = {
    LocalizationLineMapDebugController
};
