"use strict";

class DslScriptCodeLensProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.createLocation = dependencies.createLocation;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
    }

    async provideCodeLenses(document) {
        if (!this.isInscapeDocument(document)) {
            return [];
        }

        const currentDocumentNodes = this.dslScriptNodeProvider.collectDocumentNodes(document);
        if (currentDocumentNodes.length === 0) {
            return [];
        }

        const navigation = await this.dslScriptNodeProvider.collectWorkspaceNavigation(document);
        const codeLenses = [];
        for (const node of currentDocumentNodes) {
            const range = new this.vscode.Range(node.line, node.character, node.line, node.character + node.length);
            const position = new this.vscode.Position(node.line, node.character);
            const incoming = navigation.referencesByTarget.get(node.name) || [];

            codeLenses.push(new this.vscode.CodeLens(range, {
                title: incoming.length + " 个引用",
                command: "inscape.showNodeIncomingReferences",
                arguments: [
                    this.vscode.Uri.file(node.sourcePath),
                    position,
                    incoming.map((reference) => this.createLocation(reference))
                ]
            }));
        }

        return codeLenses;
    }

}

module.exports = {
    DslScriptCodeLensProvider
};
