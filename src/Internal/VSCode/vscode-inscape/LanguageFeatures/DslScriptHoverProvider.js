"use strict";

class DslScriptHoverProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptMetadataProvider = dependencies.dslScriptMetadataProvider;
        this.dslScriptQueryInterpolationProvider = dependencies.dslScriptQueryInterpolationProvider;
    }

    async provideHover(document, position) {
        if (!this.isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = this.dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const speakers = await this.dslScriptSpeakerProvider.collectWorkspaceSpeakers(document);
            const speaker = speakers.find((candidate) => candidate.name === speakerInfo.name);
            if (speaker) {
                return new this.vscode.Hover(this.dslScriptSpeakerProvider.createHoverMarkdown(speaker), speakerInfo.range);
            }
        }

        const hostBindingInfo = this.hostBindingProvider.getBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await this.hostBindingProvider.collectWorkspaceBindings(document, hostBindingInfo.kind);
            const binding = bindings.find((candidate) => candidate.alias === hostBindingInfo.alias);
            if (binding) {
                return new this.vscode.Hover(this.hostBindingProvider.createHoverMarkdown(binding), hostBindingInfo.range);
            }

            return new this.vscode.Hover(this.hostBindingProvider.createMissingHoverMarkdown({
                kind: hostBindingInfo.kind,
                alias: hostBindingInfo.alias,
                sourcePath: document.uri.fsPath
            }), hostBindingInfo.range);
        }

        const queryInterpolationInfo = this.dslScriptQueryInterpolationProvider.getInterpolationAtPosition(document, position);
        if (queryInterpolationInfo) {
            const queries = await this.dslScriptQueryInterpolationProvider.collectSchemaQueries(document);
            const query = queries.find((candidate) => candidate.name === queryInterpolationInfo.query);
            if (query) {
                return new this.vscode.Hover(this.dslScriptQueryInterpolationProvider.createHoverMarkdown(query), queryInterpolationInfo.range);
            }

            return new this.vscode.Hover(
                this.dslScriptQueryInterpolationProvider.createUnknownHoverMarkdown(queryInterpolationInfo),
                queryInterpolationInfo.range);
        }

        const metadataInfo = this.dslScriptMetadataProvider.getDirectiveAtPosition(document, position);
        if (metadataInfo) {
            return new this.vscode.Hover(this.dslScriptMetadataProvider.createHoverMarkdown(metadataInfo), metadataInfo.range);
        }

        const declaredNode = this.dslScriptNodeProvider.getDeclaredNodeAtPosition(document, position);
        if (declaredNode) {
            return new this.vscode.Hover(this.dslScriptNodeProvider.createDeclarationHoverMarkdown(declaredNode.name), declaredNode.range);
        }

        const jumpTarget = this.dslScriptNodeProvider.getJumpTargetInfoAtPosition(document, position);
        if (jumpTarget) {
            return new this.vscode.Hover(this.dslScriptNodeProvider.createJumpTargetHoverMarkdown(jumpTarget.name), jumpTarget.range);
        }

        return undefined;
    }

}

module.exports = {
    DslScriptHoverProvider
};
