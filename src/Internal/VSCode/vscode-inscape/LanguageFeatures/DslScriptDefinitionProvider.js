"use strict";

class DslScriptDefinitionProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.createLocation = dependencies.createLocation;
        this.uniqueLocations = dependencies.uniqueLocations;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptMetadataProvider = dependencies.dslScriptMetadataProvider;
        this.previewRevealBridge = dependencies.previewRevealBridge;
    }

    async provideDefinition(document, position) {
        if (!this.isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = this.dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const definitions = await this.dslScriptSpeakerProvider.collectConfiguredDefinitions(document, speakerInfo.name);
            if (definitions.length > 0) {
                return definitions.map((definition) => this.createLocation(definition));
            }

            const references = await this.dslScriptSpeakerProvider.collectWorkspaceReferences(document, speakerInfo.name);
            if (references.length > 0) {
                return references.map((reference) => this.createLocation(reference));
            }
            return undefined;
        }

        const hostBindingInfo = this.hostBindingProvider.getBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await this.hostBindingProvider.collectWorkspaceBindings(document, hostBindingInfo.kind);
            const matchingBindings = bindings.filter((candidate) => candidate.alias === hostBindingInfo.alias)
                .map((candidate) => this.createLocation(candidate));
            if (matchingBindings.length > 0) {
                return this.uniqueLocations(matchingBindings);
            }
        }

        const metadataInfo = this.dslScriptMetadataProvider.getDirectiveAtPosition(document, position);
        if (metadataInfo) {
            const locations = await this.dslScriptMetadataProvider.collectWorkspaceReferences(document, metadataInfo);
            if (locations.length > 0) {
                return this.uniqueLocations(locations.map((item) => this.createLocation(item)));
            }
        }

        const previewRevealInfo = this.previewRevealBridge.getRevealInfoAtPosition(document, position);
        if (previewRevealInfo) {
            this.previewRevealBridge.rememberDefinition(document, previewRevealInfo);
            return [this.previewRevealBridge.createDefinitionLink(document, previewRevealInfo)];
        }

        const target = this.dslScriptNodeProvider.getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const nodes = await this.dslScriptNodeProvider.collectWorkspaceNodes(document);
        const locations = nodes.filter((node) => node.name === target)
            .map((node) => new this.vscode.Location(
                this.vscode.Uri.file(node.sourcePath),
                new this.vscode.Position(node.line, node.character)
            ));

        if (locations.length > 0) {
            return locations;
        }
        return undefined;
    }

}

module.exports = {
    DslScriptDefinitionProvider
};
