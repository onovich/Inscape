"use strict";

class DslScriptDefinitionProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.createLocation = dependencies.createLocation;
        this.uniqueLocations = dependencies.uniqueLocations;
        this.resolveLanguageServerProjectPath = dependencies.resolveLanguageServerProjectPath;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptMetadataProvider = dependencies.dslScriptMetadataProvider;
        this.previewRevealBridge = dependencies.previewRevealBridge;
        this.languageServerDefinitionsByDocumentVersion = new Map();
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
            if (!this.previewRevealBridge.shouldProvideClickReveal(document)) {
                return undefined;
            }

            this.previewRevealBridge.rememberDefinition(document, previewRevealInfo);
            return [this.previewRevealBridge.createDefinitionLink(document, previewRevealInfo)];
        }

        const target = this.dslScriptNodeProvider.getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const location = await this.provideLanguageServerNodeDefinition(document, target);
        return location ? [location] : undefined;
    }

    async provideLanguageServerNodeDefinition(document, target) {
        const cacheKey = this.createCacheKey(document, target);
        if (this.languageServerDefinitionsByDocumentVersion.has(cacheKey)) {
            return this.languageServerDefinitionsByDocumentVersion.get(cacheKey);
        }

        const tempPath = this.writeTempDocument(document, "definition");
        try {
            const workspaceFolderPath = this.getWorkspaceFolderPath(document);
            const command = this.getDotnetCommand(document);
            const result = await this.execFilePromise(command, [
                "run",
                "--project",
                this.resolveLanguageServerProjectPath(workspaceFolderPath),
                "--",
                "--definition-project",
                workspaceFolderPath,
                target,
                "--override",
                document.uri.fsPath,
                tempPath
            ], workspaceFolderPath);

            const payload = JSON.parse(result.stdout);
            if (!payload
                || payload.format !== "inscape.language-server-project-definition"
                || payload.formatVersion !== 1
                || !payload.definition
                || !payload.definition.location) {
                this.languageServerDefinitionsByDocumentVersion.set(cacheKey, undefined);
                return undefined;
            }

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

    execFilePromise(command, args, cwd) {
        return new Promise((resolve, reject) => {
            this.childProcess.execFile(command, args, {
                cwd,
                windowsHide: true,
                timeout: 10000,
                maxBuffer: 1024 * 1024
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
    }

    createCacheKey(document, target) {
        const version = typeof document.version === "number" ? document.version : document.getText();
        return document.uri.toString() + ":" + version + ":" + target;
    }

}

module.exports = {
    DslScriptDefinitionProvider
};
