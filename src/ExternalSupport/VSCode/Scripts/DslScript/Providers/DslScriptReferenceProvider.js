"use strict";

class DslScriptReferenceProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.createLocation = dependencies.createLocation;
        this.uniqueLocations = dependencies.uniqueLocations;
        this.languageServerSessionClient = dependencies.languageServerSessionClient;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.languageServerReferencesByDocumentVersion = new Map();
        this.languageServerDefinitionsByDocumentVersion = new Map();
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

        let locations = await this.provideLanguageServerNodeReferences(document, target);

        if (context && context.includeDeclaration) {
            const declaration = await this.provideLanguageServerNodeDefinition(document, target);
            if (declaration) {
                locations = [declaration].concat(locations);
            }
        }

        locations = this.uniqueLocations(locations);
        return locations.length > 0 ? locations : undefined;
    }

    async provideLanguageServerNodeReferences(document, target) {
        const cacheKey = this.createCacheKey(document, "references", target);
        if (this.languageServerReferencesByDocumentVersion.has(cacheKey)) {
            return this.languageServerReferencesByDocumentVersion.get(cacheKey);
        }

        const tempPath = this.writeTempDocument(document, "references");
        try {
            const payload = await this.runLanguageServerProjectProbe(document, tempPath, "--references-project", target);
            if (!payload
                || payload.format !== "inscape.language-server-project-references"
                || payload.formatVersion !== 1
                || !Array.isArray(payload.references)) {
                this.languageServerReferencesByDocumentVersion.set(cacheKey, []);
                return [];
            }

            this.normalizeLanguageServerLocations(payload, tempPath, document.uri.fsPath);
            const locations = payload.references
                .filter((reference) => reference && reference.location)
                .map((reference) => this.createLocation(reference.location));
            this.languageServerReferencesByDocumentVersion.set(cacheKey, locations);
            return locations;
        } catch {
            this.languageServerReferencesByDocumentVersion.set(cacheKey, []);
            return [];
        } finally {
            this.deleteTempFile(tempPath);
        }
    }

    async provideLanguageServerNodeDefinition(document, target) {
        const cacheKey = this.createCacheKey(document, "definition", target);
        if (this.languageServerDefinitionsByDocumentVersion.has(cacheKey)) {
            return this.languageServerDefinitionsByDocumentVersion.get(cacheKey);
        }

        const tempPath = this.writeTempDocument(document, "definition");
        try {
            const payload = await this.runLanguageServerProjectProbe(document, tempPath, "--definition-project", target);
            if (!payload
                || payload.format !== "inscape.language-server-project-definition"
                || payload.formatVersion !== 1
                || !payload.definition
                || !payload.definition.location) {
                this.languageServerDefinitionsByDocumentVersion.set(cacheKey, undefined);
                return undefined;
            }

            this.normalizeLanguageServerLocations(payload, tempPath, document.uri.fsPath);
            const location = this.createLocation(payload.definition.location);
            this.languageServerDefinitionsByDocumentVersion.set(cacheKey, location);
            return location;
        } catch {
            this.languageServerDefinitionsByDocumentVersion.set(cacheKey, undefined);
            return undefined;
        } finally {
            this.deleteTempFile(tempPath);
        }
    }

    async runLanguageServerProjectProbe(document, tempPath, probeName, target) {
        const method = probeName === "--references-project"
            ? "inscape/referencesProject"
            : "inscape/definitionProject";
        return this.languageServerSessionClient.request(document, method, {
            rootPath: this.getWorkspaceFolderPath(document),
            target,
            overrideSourcePath: document.uri.fsPath,
            overrideContentPath: tempPath
        });
    }

    writeTempDocument(document, purpose) {
        const directory = this.path.join(this.os.tmpdir(), "inscape-vscode");
        this.fs.mkdirSync(directory, { recursive: true });

        const baseName = this.path.basename(document.uri.fsPath || "document.inscape");
        const fileName = process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + purpose + "-" + baseName;
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

    createCacheKey(document, kind, target) {
        const version = typeof document.version === "number" ? document.version : document.getText();
        return document.uri.toString() + ":" + version + ":" + kind + ":" + target;
    }

    normalizeLanguageServerLocations(payload, tempPath, documentPath) {
        this.normalizeLocation(payload && payload.definition ? payload.definition.location : undefined, tempPath, documentPath);
        const references = payload && Array.isArray(payload.references) ? payload.references : [];
        for (const reference of references) {
            this.normalizeLocation(reference ? reference.location : undefined, tempPath, documentPath);
        }
    }

    normalizeLocation(location, tempPath, documentPath) {
        if (location && this.samePath(location.sourcePath, tempPath)) {
            location.sourcePath = documentPath;
        }
    }

    samePath(left, right) {
        return String(left || "").toLowerCase() === String(right || "").toLowerCase();
    }

}

module.exports = {
    DslScriptReferenceProvider
};
