"use strict";

class EditorAuthoringDataProvider {
    constructor(dependencies) {
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.normalizePath = dependencies.normalizePath;
    }

    async readProjectConfig(document) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
            return undefined;
        }

        return this.readProjectConfigFromWorkspaceFolder(folder);
    }

    async readProjectConfigFromWorkspaceFolder(folder) {
        if (!folder) {
            return undefined;
        }

        const configPath = this.path.join(folder.uri.fsPath, "inscape.config.json");
        if (!this.fs.existsSync(configPath)) {
            return undefined;
        }

        try {
            const text = await this.fs.promises.readFile(configPath, "utf8");
            return {
                configPath,
                config: JSON.parse(text)
            };
        } catch {
            return undefined;
        }
    }

    resolveProjectConfigPath(configPath, value) {
        return this.path.isAbsolute(value)
            ? value
            : this.path.resolve(this.path.dirname(configPath), value);
    }

    parseCsvRows(text) {
        const rows = [];
        let row = [];
        let field = "";
        let inQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
            const character = text[index];
            if (inQuotes) {
                if (character === "\"") {
                    if (text[index + 1] === "\"") {
                        field += "\"";
                        index += 1;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += character;
                }
                continue;
            }

            if (character === "\"") {
                inQuotes = true;
            } else if (character === ",") {
                row.push(field);
                field = "";
            } else if (character === "\n") {
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else if (character !== "\r") {
                field += character;
            }
        }

        if (field.length > 0 || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows.filter((csvRow) => csvRow.some((fieldValue) => fieldValue.trim().length > 0));
    }

    async collectTextSources(document) {
        const sources = [];
        const seen = new Set();

        this.addTextSource(sources, seen, document.uri.fsPath, document.getText());

        for (const textDocument of this.vscode.workspace.textDocuments) {
            if (this.isInscapeDocument(textDocument)) {
                this.addTextSource(sources, seen, textDocument.uri.fsPath, textDocument.getText());
            }
        }

        const files = await this.vscode.workspace.findFiles("**/*.inscape", "{**/.git/**,**/bin/**,**/obj/**,**/node_modules/**,**/artifacts/**}", 2000);
        for (const file of files) {
            if (seen.has(this.normalizePath(file.fsPath))) {
                continue;
            }

            const text = await this.readWorkspaceFileText(file);
            this.addTextSource(sources, seen, file.fsPath, text);
        }

        return sources;
    }

    addTextSource(sources, seen, sourcePath, text) {
        const key = this.normalizePath(sourcePath);
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        sources.push({
            sourcePath,
            text
        });
    }

    async readWorkspaceFileText(uri) {
        const bytes = await this.vscode.workspace.fs.readFile(uri);
        return Buffer.from(bytes).toString("utf8");
    }
}

module.exports = {
    EditorAuthoringDataProvider
};
