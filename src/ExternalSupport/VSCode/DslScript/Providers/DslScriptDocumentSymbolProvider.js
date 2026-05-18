"use strict";

class DslScriptDocumentSymbolProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.languageServerSessionClient = dependencies.languageServerSessionClient;
        this.languageServerSymbolsByDocumentVersion = new Map();
    }

    async provideDocumentSymbols(document) {
        const cacheKey = this.createCacheKey(document);
        if (this.languageServerSymbolsByDocumentVersion.has(cacheKey)) {
            return this.languageServerSymbolsByDocumentVersion.get(cacheKey);
        }

        const languageServerSymbols = await this.tryProvideLanguageServerSymbols(document);
        if (languageServerSymbols) {
            this.languageServerSymbolsByDocumentVersion.set(cacheKey, languageServerSymbols);
            return languageServerSymbols;
        }

        this.languageServerSymbolsByDocumentVersion.set(cacheKey, []);
        return [];
    }

    async tryProvideLanguageServerSymbols(document) {
        const tempPath = this.writeTempDocument(document);
        try {
            const payload = await this.languageServerSessionClient.request(document, "inscape/documentSymbolsFile", {
                sourcePath: tempPath
            });
            if (!payload
                || payload.format !== "inscape.language-server-document-symbols"
                || payload.formatVersion !== 1
                || !Array.isArray(payload.symbols)) {
                return undefined;
            }

            return payload.symbols.map((symbol) => this.createDocumentSymbol(document, symbol))
                .filter((symbol) => symbol);
        } catch {
            return undefined;
        } finally {
            this.deleteTempFile(tempPath);
        }
    }

    createDocumentSymbol(document, symbol) {
        if (!symbol || !symbol.location || typeof symbol.name !== "string") {
            return undefined;
        }

        const location = symbol.location;
        const line = this.clamp(location.line, 0, Math.max(0, document.lineCount - 1));
        const textLine = document.lineAt(line);
        const character = this.clamp(location.character, 0, textLine.text.length);
        const length = typeof location.length === "number" && location.length > 0 ? location.length : symbol.name.length;
        const end = this.clamp(character + length, character + 1, Math.max(character + 1, textLine.text.length));
        const lineRange = textLine.range;
        const selectionRange = new this.vscode.Range(line, character, line, end);

        return new this.vscode.DocumentSymbol(
            symbol.name,
            "Inscape dialogue block",
            this.vscode.SymbolKind.Namespace,
            lineRange,
            selectionRange
        );
    }

    writeTempDocument(document) {
        const directory = this.path.join(this.os.tmpdir(), "inscape-vscode");
        this.fs.mkdirSync(directory, { recursive: true });

        const baseName = this.path.basename(document.uri.fsPath || "document.inscape");
        const fileName = process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2) + "-symbols-" + baseName;
        const tempPath = this.path.join(directory, fileName);
        this.fs.writeFileSync(tempPath, document.getText(), "utf8");
        return tempPath;
    }

    deleteTempFile(tempPath) {
        try {
            this.fs.unlinkSync(tempPath);
        } catch {
        }
    }

    getWorkspaceFolderPath(document) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (folder) {
            return folder.uri.fsPath;
        }

        if (this.vscode.workspace.workspaceFolders && this.vscode.workspace.workspaceFolders.length > 0) {
            return this.vscode.workspace.workspaceFolders[0].uri.fsPath;
        }

        return this.path.resolve(__dirname, "..", "..", "..", "..", "..");
    }

    getDotnetCommand(document) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", document.uri);
        return configuration.get("compiler.command", "dotnet");
    }

    clamp(value, minimum, maximum) {
        const number = typeof value === "number" ? value : minimum;
        if (number < minimum) {
            return minimum;
        }
        if (number > maximum) {
            return maximum;
        }
        return number;
    }

    createCacheKey(document) {
        const version = typeof document.version === "number" ? document.version : document.getText();
        return document.uri.toString() + ":" + version;
    }

}

module.exports = {
    DslScriptDocumentSymbolProvider
};
