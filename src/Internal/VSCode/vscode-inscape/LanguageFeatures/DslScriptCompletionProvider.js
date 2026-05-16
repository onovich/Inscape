"use strict";

class DslScriptCompletionProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.isJumpTargetContext = dependencies.isJumpTargetContext;
        this.isSpeakerCompletionContext = dependencies.isSpeakerCompletionContext;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptQueryInterpolationProvider = dependencies.dslScriptQueryInterpolationProvider;
        this.dslScriptHostEventProvider = dependencies.dslScriptHostEventProvider;
    }

    async provideCompletionItems(document, position) {
        if (!this.isInscapeDocument(document)) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (this.isJumpTargetContext(linePrefix)) {
            const nodes = await this.dslScriptNodeProvider.collectWorkspaceNodes(document);
            return nodes.map((node) => {
                const name = node.name;
                const item = new this.vscode.CompletionItem(name, this.vscode.CompletionItemKind.Reference);
                item.insertText = name;
                item.detail = node.sourcePath === document.uri.fsPath ? "Inscape node in this file" : "Inscape project node";
                item.documentation = node.sourcePath;
                item.sortText = "0_" + name;
                return item;
            });
        }

        const hostBindingContext = this.hostBindingProvider.getBindingCompletionContext(linePrefix);
        if (hostBindingContext) {
            const bindings = await this.hostBindingProvider.collectWorkspaceBindings(document, hostBindingContext.kind);
            return bindings.map((binding) => this.hostBindingProvider.createCompletionItem(binding));
        }

        const hostEventContext = this.dslScriptHostEventProvider.getEventCompletionContext(linePrefix);
        if (hostEventContext) {
            const events = await this.dslScriptHostEventProvider.collectSchemaEvents(document);
            return events.map((hostEvent) => {
                const item = this.dslScriptHostEventProvider.createCompletionItem(hostEvent);
                item.range = new this.vscode.Range(
                    position.line,
                    hostEventContext.startCharacter,
                    position.line,
                    hostEventContext.endCharacter);
                return item;
            });
        }

        const queryInterpolationContext = this.dslScriptQueryInterpolationProvider.getCompletionContext(linePrefix);
        if (queryInterpolationContext) {
            const queries = await this.dslScriptQueryInterpolationProvider.collectSchemaQueries(document);
            return queries.map((query) => {
                const item = this.dslScriptQueryInterpolationProvider.createCompletionItem(query);
                item.range = new this.vscode.Range(
                    position.line,
                    queryInterpolationContext.startCharacter,
                    position.line,
                    queryInterpolationContext.endCharacter);
                return item;
            });
        }

        if (this.isSpeakerCompletionContext(linePrefix)) {
            const speakers = await this.dslScriptSpeakerProvider.collectWorkspaceSpeakers(document);
            return speakers.map((speaker) => this.dslScriptSpeakerProvider.createCompletionItem(speaker));
        }

        return undefined;
    }

}

module.exports = {
    DslScriptCompletionProvider
};
