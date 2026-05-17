"use strict";

class DslScriptHoverProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.resolveLanguageServerProjectPath = dependencies.resolveLanguageServerProjectPath;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptMetadataProvider = dependencies.dslScriptMetadataProvider;
        this.dslScriptQueryInterpolationProvider = dependencies.dslScriptQueryInterpolationProvider;
        this.dslScriptHostEventProvider = dependencies.dslScriptHostEventProvider;
        this.languageServerHoversByDocumentVersion = new Map();
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

        const hostEventInfo = this.dslScriptHostEventProvider.getEventAtPosition(document, position);
        if (hostEventInfo) {
            const events = await this.dslScriptHostEventProvider.collectSchemaEvents(document);
            const hostEvent = events.find((candidate) => candidate.name === hostEventInfo.name);
            if (hostEvent) {
                return new this.vscode.Hover(this.dslScriptHostEventProvider.createHoverMarkdown(hostEvent), hostEventInfo.range);
            }

            return new this.vscode.Hover(
                this.dslScriptHostEventProvider.createUnknownHoverMarkdown(hostEventInfo),
                hostEventInfo.range);
        }

        const metadataInfo = this.dslScriptMetadataProvider.getDirectiveAtPosition(document, position);
        if (metadataInfo) {
            return new this.vscode.Hover(this.dslScriptMetadataProvider.createHoverMarkdown(metadataInfo), metadataInfo.range);
        }

        const declaredNode = this.dslScriptNodeProvider.getDeclaredNodeAtPosition(document, position);
        if (declaredNode) {
            return await this.provideLanguageServerNodeHover(document, "node", declaredNode.name, declaredNode.range);
        }

        const jumpTarget = this.dslScriptNodeProvider.getJumpTargetInfoAtPosition(document, position);
        if (jumpTarget) {
            return await this.provideLanguageServerNodeHover(document, "jump", jumpTarget.name, jumpTarget.range);
        }

        return undefined;
    }

    async provideLanguageServerNodeHover(document, kind, target, range) {
        const cacheKey = this.createCacheKey(document, kind, target, range);
        if (this.languageServerHoversByDocumentVersion.has(cacheKey)) {
            return this.languageServerHoversByDocumentVersion.get(cacheKey);
        }

        const tempPath = this.writeTempDocument(document, "hover");
        try {
            const workspaceFolderPath = this.getWorkspaceFolderPath(document);
            const command = this.getDotnetCommand(document);
            const result = await this.execFilePromise(command, [
                "run",
                "--project",
                this.resolveLanguageServerProjectPath(workspaceFolderPath),
                "--",
                "--hover-project",
                workspaceFolderPath,
                kind,
                target,
                "--override",
                document.uri.fsPath,
                tempPath
            ], workspaceFolderPath);

            const payload = JSON.parse(result.stdout);
            if (!payload
                || payload.format !== "inscape.language-server-project-hover"
                || payload.formatVersion !== 1
                || !payload.hover
                || typeof payload.hover.markdown !== "string") {
                this.languageServerHoversByDocumentVersion.set(cacheKey, undefined);
                return undefined;
            }

            const markdown = new this.vscode.MarkdownString(undefined, true);
            markdown.isTrusted = false;
            markdown.appendMarkdown(payload.hover.markdown);
            const hover = new this.vscode.Hover(markdown, range);
            this.languageServerHoversByDocumentVersion.set(cacheKey, hover);
            return hover;
        } catch {
            this.languageServerHoversByDocumentVersion.set(cacheKey, undefined);
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

    createCacheKey(document, kind, target, range) {
        const version = typeof document.version === "number" ? document.version : document.getText();
        return document.uri.toString()
            + ":" + version
            + ":" + kind
            + ":" + target
            + ":" + range.start.line
            + ":" + range.start.character
            + ":" + range.end.line
            + ":" + range.end.character;
    }

}

module.exports = {
    DslScriptHoverProvider
};
