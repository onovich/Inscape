"use strict";

class DslScriptDocumentSymbolProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
    }

    provideDocumentSymbols(document) {
        const symbols = [];
        const nodes = this.dslScriptNodeProvider.collectDocumentNodes(document);

        for (const node of nodes) {
            const range = document.lineAt(node.line).range;
            symbols.push(new this.vscode.DocumentSymbol(
                node.name,
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
