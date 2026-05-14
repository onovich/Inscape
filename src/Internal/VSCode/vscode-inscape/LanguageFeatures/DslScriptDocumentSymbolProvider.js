"use strict";

class DslScriptDocumentSymbolProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
    }

    provideDocumentSymbols(document) {
        const symbols = [];
        const nodePattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;

        for (let line = 0; line < document.lineCount; line += 1) {
            const textLine = document.lineAt(line);
            const match = nodePattern.exec(textLine.text);
            if (!match) {
                continue;
            }

            const range = textLine.range;
            symbols.push(new this.vscode.DocumentSymbol(
                match[1],
                "Inscape dialogue block",
                this.vscode.SymbolKind.Namespace,
                range,
                range
            ));
        }

        return symbols;
    }

}

module.exports = {
    DslScriptDocumentSymbolProvider
};
