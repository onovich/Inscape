"use strict";

class DslScriptReferenceProvider {

    constructor(dependencies) {
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.createLocation = dependencies.createLocation;
        this.uniqueLocations = dependencies.uniqueLocations;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
    }

    async provideReferences(document, position, context) {
        if (!this.isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = this.dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const references = await this.dslScriptSpeakerProvider.collectWorkspaceReferences(document, speakerInfo.name);
            let locations = references.map((reference) => this.createLocation(reference));

            if (context && context.includeDeclaration) {
                const definitions = await this.dslScriptSpeakerProvider.collectConfiguredDefinitions(document, speakerInfo.name);
                locations = definitions.map((definition) => this.createLocation(definition)).concat(locations);
            }

            locations = this.uniqueLocations(locations);
            return locations.length > 0 ? locations : undefined;
        }

        const target = this.dslScriptNodeProvider.getDeclaredNodeNameAtPosition(document, position)
            || this.dslScriptNodeProvider.getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const references = await this.dslScriptNodeProvider.collectWorkspaceJumpReferences(document, target);
        let locations = references.map((reference) => this.createLocation(reference));

        if (context && context.includeDeclaration) {
            const declarations = await this.dslScriptNodeProvider.collectWorkspaceNodes(document);
            locations = declarations.filter((node) => node.name === target)
                .map((node) => this.createLocation(node))
                .concat(locations);
        }

        locations = this.uniqueLocations(locations);
        return locations.length > 0 ? locations : undefined;
    }

}

module.exports = {
    DslScriptReferenceProvider
};
