"use strict";

class DslScriptCompletionProvider {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.isJumpTargetContext = dependencies.isJumpTargetContext;
        this.resolveLanguageServerProjectPath = dependencies.resolveLanguageServerProjectPath;
        this.isSpeakerCompletionContext = dependencies.isSpeakerCompletionContext;
        this.dslScriptSpeakerProvider = dependencies.dslScriptSpeakerProvider;
        this.hostBindingProvider = dependencies.hostBindingProvider;
        this.dslScriptQueryInterpolationProvider = dependencies.dslScriptQueryInterpolationProvider;
        this.dslScriptHostEventProvider = dependencies.dslScriptHostEventProvider;
        this.languageServerCompletionsByDocumentVersion = new Map();
    }

    async provideCompletionItems(document, position) {
        if (!this.isInscapeDocument(document)) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (this.isJumpTargetContext(linePrefix)) {
            return this.provideNodeCompletions(document);
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

    async provideNodeCompletions(document) {
        const items = [];
        const languageServerCompletions = await this.collectLanguageServerNodeCompletions(document);

        for (const completion of languageServerCompletions) {
            const item = this.createNodeCompletionItem(completion.label, completion.location, "LanguageServer node");
            item.sortText = "0_" + completion.label;
            items.push(item);
        }

        return items;
    }

    createNodeCompletionItem(name, location, detail) {
        const item = new this.vscode.CompletionItem(name, this.vscode.CompletionItemKind.Reference);
        item.insertText = name;
        item.detail = detail;
        if (location && location.sourcePath) {
            item.documentation = location.sourcePath;
        }
        return item;
    }

    async collectLanguageServerNodeCompletions(document) {
        const cacheKey = this.createCacheKey(document);
        if (this.languageServerCompletionsByDocumentVersion.has(cacheKey)) {
            return this.languageServerCompletionsByDocumentVersion.get(cacheKey);
        }

        const tempPath = this.writeTempDocument(document);
        try {
            const workspaceFolderPath = this.getWorkspaceFolderPath(document);
            const command = this.getDotnetCommand(document);
            const result = await this.execFilePromise(command, [
                "run",
                "--project",
                this.resolveLanguageServerProjectPath(workspaceFolderPath),
                "--",
                "--completion-project",
                workspaceFolderPath,
                "--override",
                document.uri.fsPath,
                tempPath
            ], workspaceFolderPath);

            const payload = JSON.parse(result.stdout);
            if (!payload
                || payload.format !== "inscape.language-server-project-completions"
                || payload.formatVersion !== 1
                || !Array.isArray(payload.completions)) {
                return [];
            }

            const completions = payload.completions.filter((completion) => completion && typeof completion.label === "string");
            this.languageServerCompletionsByDocumentVersion.set(cacheKey, completions);
            return completions;
        } catch {
            return [];
        } finally {
            this.deleteTempFile(tempPath);
        }
    }

    writeTempDocument(document) {
        const directory = this.path.join(this.os.tmpdir(), "inscape-vscode");
        this.fs.mkdirSync(directory, { recursive: true });

        const baseName = this.path.basename(document.uri.fsPath || "document.inscape");
        const fileName = process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2) + "-completion-" + baseName;
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

    createCacheKey(document) {
        const version = typeof document.version === "number" ? document.version : document.getText();
        return document.uri.toString() + ":" + version;
    }

}

module.exports = {
    DslScriptCompletionProvider
};
