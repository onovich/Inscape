"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const languageSelector = { language: "inscape" };

function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection("inscape");
    const scheduler = new DiagnosticScheduler(context, diagnostics);

    context.subscriptions.push(
        diagnostics,
        scheduler,
        vscode.workspace.onDidOpenTextDocument((document) => scheduler.schedule(document)),
        vscode.workspace.onDidChangeTextDocument((event) => scheduler.schedule(event.document)),
        vscode.workspace.onDidSaveTextDocument((document) => scheduler.schedule(document, 0)),
        vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("inscape")) {
                refreshVisibleDocuments(scheduler);
            }
        }),
        vscode.languages.registerCompletionItemProvider(languageSelector, new InscapeCompletionProvider(), ">", ".", ":", "\uFF1A", "[", " "),
        vscode.languages.registerDocumentSymbolProvider(languageSelector, new InscapeDocumentSymbolProvider()),
        vscode.languages.registerDefinitionProvider(languageSelector, new InscapeDefinitionProvider()),
        vscode.languages.registerReferenceProvider(languageSelector, new InscapeReferenceProvider()),
        vscode.languages.registerHoverProvider(languageSelector, new InscapeHoverProvider()),
        vscode.commands.registerCommand("inscape.extractLocalization", () => exportLocalization(context)),
        vscode.commands.registerCommand("inscape.updateLocalization", () => updateLocalization(context))
    );

    refreshVisibleDocuments(scheduler);
}

function deactivate() {
}

class DiagnosticScheduler {

    constructor(context, diagnostics) {
        this.context = context;
        this.diagnostics = diagnostics;
        this.timers = new Map();
        this.runIds = new Map();
    }

    schedule(document, delayOverride) {
        if (!isInscapeDocument(document)) {
            return;
        }

        const configuration = vscode.workspace.getConfiguration("inscape", document.uri);
        if (!configuration.get("diagnostics.enabled", true)) {
            this.diagnostics.delete(document.uri);
            return;
        }

        const key = document.uri.toString();
        const existing = this.timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        const delay = typeof delayOverride === "number"
            ? delayOverride
            : Math.max(100, configuration.get("diagnostics.debounceMs", 450));

        this.timers.set(key, setTimeout(() => {
            this.timers.delete(key);
            this.run(document);
        }, delay));
    }

    run(document) {
        const key = document.uri.toString();
        const runId = (this.runIds.get(key) || 0) + 1;
        this.runIds.set(key, runId);

        let tempPath;
        try {
            tempPath = writeTempDocument(document);
        } catch (error) {
            this.diagnostics.set(document.uri, [
                createExtensionDiagnostic(document, "Unable to prepare Inscape diagnostics: " + error.message)
            ]);
            return;
        }

        const invocation = createCompilerInvocation(this.context, document, tempPath);
        childProcess.execFile(invocation.command, invocation.args, {
            cwd: invocation.cwd,
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 8
        }, (error, stdout, stderr) => {
            fs.unlink(tempPath, () => { });

            if (this.runIds.get(key) !== runId) {
                return;
            }

            if (!stdout || !stdout.trim()) {
                const message = stderr && stderr.trim()
                    ? stderr.trim()
                    : (error && error.message ? error.message : "Inscape compiler produced no diagnostic output.");
                this.diagnostics.set(document.uri, [
                    createExtensionDiagnostic(document, message)
                ]);
                return;
            }

            try {
                const payload = JSON.parse(stdout);
                applyDiagnostics(this.diagnostics, document, payload.diagnostics || []);
            } catch (parseError) {
                this.diagnostics.set(document.uri, [
                    createExtensionDiagnostic(document, "Unable to parse Inscape diagnostics: " + parseError.message)
                ]);
            }
        });
    }

    dispose() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.runIds.clear();
    }
}

class InscapeCompletionProvider {

    async provideCompletionItems(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (isJumpTargetContext(linePrefix)) {
            const nodes = await collectWorkspaceNodes(document);
            return nodes.map((node) => {
                const name = node.name;
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Reference);
                item.insertText = name;
                item.detail = node.sourcePath === document.uri.fsPath ? "Inscape node in this file" : "Inscape project node";
                item.documentation = node.sourcePath;
                item.sortText = "0_" + name;
                return item;
            });
        }

        const hostBindingContext = getHostBindingCompletionContext(linePrefix);
        if (hostBindingContext) {
            const bindings = await collectWorkspaceHostBindings(document, hostBindingContext.kind);
            return bindings.map((binding) => createHostBindingCompletionItem(binding));
        }

        if (isSpeakerCompletionContext(linePrefix)) {
            const speakers = await collectWorkspaceSpeakers(document);
            return speakers.map((speaker) => createSpeakerCompletionItem(speaker));
        }

        return undefined;
    }
}

class InscapeDefinitionProvider {

    async provideDefinition(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = getDialogueSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const definitions = await collectConfiguredRoleMapSpeakerDefinitions(document, speakerInfo.name);
            return definitions.length > 0 ? definitions.map((definition) => createLocation(definition)) : undefined;
        }

        const target = getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const nodes = await collectWorkspaceNodes(document);
        const locations = nodes.filter((node) => node.name === target)
            .map((node) => new vscode.Location(
                vscode.Uri.file(node.sourcePath),
                new vscode.Position(node.line, node.character)
            ));

        return locations.length > 0 ? locations : undefined;
    }
}

class InscapeReferenceProvider {

    async provideReferences(document, position, context) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = getDialogueSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const references = await collectWorkspaceDialogueSpeakerReferences(document, speakerInfo.name);
            let locations = references.map((reference) => createLocation(reference));

            if (context && context.includeDeclaration) {
                const definitions = await collectConfiguredRoleMapSpeakerDefinitions(document, speakerInfo.name);
                locations = definitions.map((definition) => createLocation(definition)).concat(locations);
            }

            locations = uniqueLocations(locations);
            return locations.length > 0 ? locations : undefined;
        }

        const target = getNodeNameAtDeclarationPosition(document, position) || getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const references = await collectWorkspaceJumpReferences(document, target);
        let locations = references.map((reference) => createLocation(reference));

        if (context && context.includeDeclaration) {
            const declarations = await collectWorkspaceNodes(document);
            locations = declarations.filter((node) => node.name === target)
                .map((node) => createLocation(node))
                .concat(locations);
        }

        locations = uniqueLocations(locations);
        return locations.length > 0 ? locations : undefined;
    }
}

class InscapeHoverProvider {

    async provideHover(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = getDialogueSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const speakers = await collectWorkspaceSpeakers(document);
            const speaker = speakers.find((candidate) => candidate.name === speakerInfo.name);
            if (speaker) {
                return new vscode.Hover(createSpeakerHoverMarkdown(speaker), speakerInfo.range);
            }
        }

        const hostBindingInfo = getHostBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await collectWorkspaceHostBindings(document, hostBindingInfo.kind);
            const binding = bindings.find((candidate) => candidate.alias === hostBindingInfo.alias);
            if (binding) {
                return new vscode.Hover(createHostBindingHoverMarkdown(binding), hostBindingInfo.range);
            }
        }

        const node = getNodeDeclarationAtPosition(document, position) || getJumpTargetAtPositionInfo(document, position);
        if (!node) {
            return undefined;
        }

        const declarations = (await collectWorkspaceNodes(document)).filter((candidate) => candidate.name === node.name);
        const references = await collectWorkspaceJumpReferences(document, node.name);
        const outgoingTargets = await collectWorkspaceOutgoingTargets(document, node.name);
        const markdown = createNodeHoverMarkdown(node.name, declarations, references, outgoingTargets);

        return new vscode.Hover(markdown, node.range);
    }
}

class InscapeDocumentSymbolProvider {

    provideDocumentSymbols(document) {
        const symbols = [];
        const nodePattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;

        for (let line = 0; line < document.lineCount; line += 1) {
            const textLine = document.lineAt(line);
            const match = nodePattern.exec(textLine.text);
            if (!match) {
                continue;
            }

            const range = textLine.range;
            symbols.push(new vscode.DocumentSymbol(
                match[1],
                "Inscape node",
                vscode.SymbolKind.Namespace,
                range,
                range
            ));
        }

        return symbols;
    }
}

function refreshVisibleDocuments(scheduler) {
    for (const editor of vscode.window.visibleTextEditors) {
        scheduler.schedule(editor.document, 0);
    }
}

async function exportLocalization(context) {
    const workspaceFolder = await selectWorkspaceFolder();
    if (!workspaceFolder) {
        return;
    }

    const outputUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, "artifacts", "l10n.csv")),
        filters: {
            "CSV": ["csv"]
        },
        saveLabel: "Export Localization"
    });

    if (!outputUri) {
        return;
    }

    await runLocalizationCommand(context, workspaceFolder, {
        commandName: "extract-l10n-project",
        outputPath: outputUri.fsPath,
        progressTitle: "Exporting Inscape localization CSV"
    });
}

async function updateLocalization(context) {
    const workspaceFolder = await selectWorkspaceFolder();
    if (!workspaceFolder) {
        return;
    }

    const previousUris = await vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, "artifacts")),
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            "CSV": ["csv"]
        },
        openLabel: "Select Previous Localization CSV"
    });

    if (!previousUris || previousUris.length === 0) {
        return;
    }

    const outputUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, "artifacts", "l10n.updated.csv")),
        filters: {
            "CSV": ["csv"]
        },
        saveLabel: "Update Localization"
    });

    if (!outputUri) {
        return;
    }

    await runLocalizationCommand(context, workspaceFolder, {
        commandName: "update-l10n-project",
        previousPath: previousUris[0].fsPath,
        outputPath: outputUri.fsPath,
        progressTitle: "Updating Inscape localization CSV"
    });
}

async function selectWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders || [];
    if (folders.length === 0) {
        vscode.window.showWarningMessage("Open a workspace folder before running Inscape localization commands.");
        return undefined;
    }

    if (folders.length === 1) {
        return folders[0];
    }

    const selected = await vscode.window.showQuickPick(folders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder
    })), {
        placeHolder: "Select the Inscape workspace to process"
    });

    return selected ? selected.folder : undefined;
}

async function runLocalizationCommand(context, workspaceFolder, options) {
    const editorDocument = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
    const activeDocument = editorDocument
        && isInscapeDocument(editorDocument)
        && isDocumentInWorkspaceFolder(editorDocument, workspaceFolder)
        ? vscode.window.activeTextEditor.document
        : undefined;
    let tempPath;

    try {
        if (activeDocument) {
            tempPath = writeTempDocument(activeDocument);
        }

        const invocation = createProjectCommandInvocation(context, workspaceFolder, options, activeDocument, tempPath);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: options.progressTitle,
            cancellable: false
        }, () => execFilePromise(invocation));

        vscode.window.showInformationMessage("Inscape localization CSV written to " + options.outputPath);
    } catch (error) {
        vscode.window.showErrorMessage(error.message || String(error));
    } finally {
        if (tempPath) {
            fs.unlink(tempPath, () => { });
        }
    }
}

function createProjectCommandInvocation(context, workspaceFolder, options, activeDocument, tempPath) {
    const configuration = vscode.workspace.getConfiguration("inscape", workspaceFolder.uri);
    const command = configuration.get("compiler.command", "dotnet");
    const cliProject = resolveCliProjectPath(context, workspaceFolder.uri.fsPath);
    const args = [
        "run",
        "--project",
        cliProject,
        "--",
        options.commandName,
        workspaceFolder.uri.fsPath
    ];

    if (options.previousPath) {
        args.push("--from", options.previousPath);
    }

    if (activeDocument && tempPath) {
        args.push("--override", activeDocument.uri.fsPath, tempPath);
    }

    args.push("-o", options.outputPath);

    return {
        command,
        args,
        cwd: workspaceFolder.uri.fsPath
    };
}

function resolveCliProjectPath(context, workspaceFolderPath) {
    const candidates = [
        path.join(workspaceFolderPath, "src", "Inscape.Cli", "Inscape.Cli.csproj"),
        path.resolve(context.extensionPath, "..", "..", "src", "Inscape.Cli", "Inscape.Cli.csproj")
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
}

function isDocumentInWorkspaceFolder(document, workspaceFolder) {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    return folder && normalizePath(folder.uri.fsPath) === normalizePath(workspaceFolder.uri.fsPath);
}

function execFilePromise(invocation) {
    return new Promise((resolve, reject) => {
        childProcess.execFile(invocation.command, invocation.args, {
            cwd: invocation.cwd,
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 8
        }, (error, stdout, stderr) => {
            if (error) {
                const detail = stderr && stderr.trim()
                    ? stderr.trim()
                    : (stdout && stdout.trim() ? stdout.trim() : error.message);
                reject(new Error(detail));
                return;
            }

            resolve(stdout);
        });
    });
}

function isInscapeDocument(document) {
    return document && document.languageId === "inscape" && document.uri.scheme === "file";
}

function writeTempDocument(document) {
    const directory = path.join(os.tmpdir(), "inscape-vscode");
    fs.mkdirSync(directory, { recursive: true });

    const baseName = path.basename(document.uri.fsPath || "document.inscape");
    const fileName = process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + baseName;
    const tempPath = path.join(directory, fileName);
    fs.writeFileSync(tempPath, document.getText(), "utf8");
    return tempPath;
}

function createCompilerInvocation(context, document, tempPath) {
    const configuration = vscode.workspace.getConfiguration("inscape", document.uri);
    const command = configuration.get("compiler.command", "dotnet");
    const configuredArgs = configuration.get("compiler.args", []);
    const rawArgs = Array.isArray(configuredArgs) ? configuredArgs : [];
    const workspaceFolder = getWorkspaceFolder(context, document);
    const variables = {
        "${workspaceFolder}": workspaceFolder,
        "${extensionPath}": context.extensionPath,
        "${file}": tempPath,
        "${documentFile}": document.uri.fsPath
    };

    const args = rawArgs.map((value) => replaceVariables(String(value), variables));
    return {
        command,
        args,
        cwd: workspaceFolder
    };
}

function getWorkspaceFolder(context, document) {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (folder) {
        return folder.uri.fsPath;
    }

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }

    return path.resolve(context.extensionPath, "..", "..");
}

function replaceVariables(value, variables) {
    let result = value;
    for (const variableName of Object.keys(variables)) {
        result = result.split(variableName).join(variables[variableName]);
    }
    return result;
}

function applyDiagnostics(collection, currentDocument, diagnostics) {
    const documents = vscode.workspace.textDocuments.filter((document) => isInscapeDocument(document));
    const mappedUris = new Set();

    for (const document of documents) {
        const mapped = mapDiagnosticsForDocument(document, diagnostics);
        collection.set(document.uri, mapped);
        mappedUris.add(document.uri.toString());
    }

    if (!mappedUris.has(currentDocument.uri.toString())) {
        collection.set(currentDocument.uri, mapDiagnosticsForDocument(currentDocument, diagnostics));
    }
}

function mapDiagnosticsForDocument(document, diagnostics) {
    return diagnostics.filter((diagnostic) => diagnosticMatchesDocument(diagnostic, document))
        .map((diagnostic) => {
        const line = clamp((diagnostic.line || 1) - 1, 0, Math.max(0, document.lineCount - 1));
        const textLine = document.lineAt(line);
        const column = clamp((diagnostic.column || 1) - 1, 0, textLine.text.length);
        const end = column < textLine.text.length ? textLine.text.length : Math.min(column + 1, textLine.text.length + 1);
        const range = new vscode.Range(line, column, line, end);
        const vscodeDiagnostic = new vscode.Diagnostic(
            range,
            diagnostic.message || "Inscape diagnostic",
            mapSeverity(diagnostic.severity)
        );

        vscodeDiagnostic.code = diagnostic.code;
        vscodeDiagnostic.source = "Inscape";
        return vscodeDiagnostic;
    });
}

function diagnosticMatchesDocument(diagnostic, document) {
    if (!diagnostic || !diagnostic.sourcePath) {
        return true;
    }

    return normalizePath(diagnostic.sourcePath) === normalizePath(document.uri.fsPath);
}

function createExtensionDiagnostic(document, message) {
    const line = document.lineCount > 0 ? 0 : 0;
    const range = document.lineCount > 0 ? document.lineAt(line).range : new vscode.Range(0, 0, 0, 1);
    const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = "Inscape VSCode";
    return diagnostic;
}

function mapSeverity(severity) {
    const value = String(severity || "").toLowerCase();
    if (value === "error") {
        return vscode.DiagnosticSeverity.Error;
    }
    if (value === "warning") {
        return vscode.DiagnosticSeverity.Warning;
    }
    if (value === "information" || value === "info") {
        return vscode.DiagnosticSeverity.Information;
    }
    return vscode.DiagnosticSeverity.Hint;
}

function isJumpTargetContext(linePrefix) {
    return /(?:^|\s)->\s*[A-Za-z0-9_.-]*$/.test(linePrefix);
}

function isSpeakerCompletionContext(linePrefix) {
    const trimmed = linePrefix.trimStart();
    if (!trimmed) {
        return true;
    }

    if (trimmed.startsWith("::")
        || trimmed.startsWith("@")
        || trimmed.startsWith("//")
        || trimmed.startsWith("->")
        || trimmed.startsWith("?")
        || trimmed.startsWith("-")
        || trimmed.startsWith("[")
        || trimmed.includes(":")
        || trimmed.includes("\uFF1A")) {
        return false;
    }

    return !/\s/.test(trimmed);
}

function getHostBindingCompletionContext(linePrefix) {
    if (/^\s*@timeline(?::|\s+)\s*[^\s\]]*$/.test(linePrefix)) {
        return { kind: "timeline" };
    }

    const openBracket = linePrefix.lastIndexOf("[");
    const closeBracket = linePrefix.lastIndexOf("]");
    if (openBracket <= closeBracket) {
        return undefined;
    }

    const body = linePrefix.slice(openBracket + 1);
    const match = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*[^\]]*$/.exec(body);
    return match ? { kind: match[1] } : undefined;
}

async function collectWorkspaceHostBindings(document, kind) {
    const bindings = [];
    const seen = new Set();

    const configured = await readConfiguredHostBindings(document);
    for (const binding of configured) {
        if (binding.kind === kind) {
            addHostBinding(bindings, seen, binding);
        }
    }

    const sources = await collectWorkspaceTextSources(document);
    for (const source of sources) {
        collectHostBindingsFromText(source.text, source.sourcePath, kind, bindings, seen);
    }

    return bindings.sort((left, right) => {
        if (left.sourceRank !== right.sourceRank) {
            return left.sourceRank - right.sourceRank;
        }
        return left.alias.localeCompare(right.alias, "zh-Hans-CN");
    });
}

async function readConfiguredHostBindings(document) {
    const projectConfig = await readProjectConfig(document);
    if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.bird) {
        return [];
    }

    const bindingMap = projectConfig.config.bird.bindingMap;
    if (!bindingMap) {
        return [];
    }

    const bindingMapPath = resolveProjectConfigPath(projectConfig.configPath, bindingMap);
    if (!fs.existsSync(bindingMapPath)) {
        return [];
    }

    const text = await fs.promises.readFile(bindingMapPath, "utf8");
    const rows = parseCsvRows(text).filter((row) => !(row[0] || "").trim().startsWith("#"));
    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map((header) => header.trim());
    const hasHeader = headers.includes("kind") && headers.includes("alias");
    const kindIndex = hasHeader ? headers.indexOf("kind") : 0;
    const aliasIndex = hasHeader ? headers.indexOf("alias") : 1;
    const birdIdIndex = hasHeader ? headers.indexOf("birdId") : 2;
    const unityGuidIndex = hasHeader ? headers.indexOf("unityGuid") : 3;
    const addressableKeyIndex = hasHeader ? headers.indexOf("addressableKey") : 4;
    const assetPathIndex = hasHeader ? headers.indexOf("assetPath") : 5;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows
        .map((row) => ({
            kind: (row[kindIndex] || "").trim(),
            alias: (row[aliasIndex] || "").trim(),
            birdId: readOptionalCsvField(row, birdIdIndex),
            unityGuid: readOptionalCsvField(row, unityGuidIndex),
            addressableKey: readOptionalCsvField(row, addressableKeyIndex),
            assetPath: readOptionalCsvField(row, assetPathIndex),
            sourcePath: bindingMapPath,
            sourceLabel: "Bird binding map",
            sourceRank: 0
        }))
        .filter((binding) => binding.kind.length > 0 && binding.alias.length > 0);
}

function readOptionalCsvField(row, index) {
    return index >= 0 && index < row.length ? (row[index] || "").trim() : "";
}

function collectHostBindingsFromText(text, sourcePath, requestedKind, bindings, seen) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (const line of lines) {
        const metadataMatch = /^\s*@timeline(?::|\s+)\s*([^\s\]]+)/.exec(line);
        if (requestedKind === "timeline" && metadataMatch) {
            addHostBinding(bindings, seen, {
                kind: "timeline",
                alias: metadataMatch[1].trim(),
                birdId: "",
                unityGuid: "",
                addressableKey: "",
                assetPath: "",
                sourcePath,
                sourceLabel: "Workspace timeline hook",
                sourceRank: 1
            });
        }

        const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*([^\]\s]+)\]/g;
        let inlineMatch = inlinePattern.exec(line);
        while (inlineMatch) {
            const kind = inlineMatch[1].trim();
            const alias = inlineMatch[2].trim();
            if (kind === requestedKind && alias.length > 0) {
                addHostBinding(bindings, seen, {
                    kind,
                    alias,
                    birdId: "",
                    unityGuid: "",
                    addressableKey: "",
                    assetPath: "",
                    sourcePath,
                    sourceLabel: "Workspace inline tag",
                    sourceRank: 1
                });
            }
            inlineMatch = inlinePattern.exec(line);
        }
    }
}

function addHostBinding(bindings, seen, binding) {
    const key = binding.kind + "\n" + binding.alias;
    if (seen.has(key)) {
        return;
    }

    seen.add(key);
    bindings.push(binding);
}

function createHostBindingCompletionItem(binding) {
    const item = new vscode.CompletionItem(binding.alias, vscode.CompletionItemKind.Reference);
    item.insertText = binding.alias;
    item.detail = createHostBindingDetail(binding);
    item.documentation = createHostBindingMarkdown(binding);
    item.sortText = (binding.sourceRank || 0) + "_" + binding.alias;
    return item;
}

function createHostBindingDetail(binding) {
    const pieces = [binding.kind];
    if (binding.birdId) {
        pieces.push("Bird " + binding.birdId);
    }
    if (binding.addressableKey) {
        pieces.push(binding.addressableKey);
    }
    if (pieces.length === 1) {
        pieces.push(binding.sourceLabel + " (unbound)");
    }
    return pieces.join(" / ");
}

async function collectWorkspaceSpeakers(document) {
    const speakers = [];
    const seen = new Set();

    const configured = await readConfiguredRoleMapSpeakerRows(document);
    for (const speaker of configured) {
        addSpeaker(speakers, seen, speaker);
    }

    const sources = await collectWorkspaceTextSources(document);
    for (const source of sources) {
        collectSpeakersFromText(source.text, source.sourcePath, speakers, seen);
    }

    return speakers.sort((left, right) => {
        if (left.sourceRank !== right.sourceRank) {
            return left.sourceRank - right.sourceRank;
        }
        return left.name.localeCompare(right.name, "zh-Hans-CN");
    });
}

async function collectConfiguredRoleMapSpeakerDefinitions(document, speakerName) {
    const speakers = await readConfiguredRoleMapSpeakerRows(document);
    return speakers.filter((speaker) => speaker.name === speakerName && typeof speaker.line === "number");
}

async function readConfiguredRoleMapSpeakerRows(document) {
    const roleMapPath = await getConfiguredRoleMapPath(document);
    if (!roleMapPath) {
        return [];
    }

    const text = await fs.promises.readFile(roleMapPath, "utf8");
    return parseRoleMapSpeakerRows(text, roleMapPath);
}

async function getConfiguredRoleMapPath(document) {
    const projectConfig = await readProjectConfig(document);
    if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.bird) {
        return undefined;
    }

    const roleMap = projectConfig.config.bird.roleMap;
    if (!roleMap) {
        return undefined;
    }

    const roleMapPath = resolveProjectConfigPath(projectConfig.configPath, roleMap);
    if (!fs.existsSync(roleMapPath)) {
        return undefined;
    }

    return roleMapPath;
}

function parseRoleMapSpeakerRows(text, roleMapPath) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let headerLine = -1;
    let headers = [];

    for (let line = 0; line < lines.length; line += 1) {
        const trimmed = lines[line].trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const parsed = parseCsvRows(lines[line]);
        if (parsed.length === 0) {
            continue;
        }

        headers = parsed[0].map((header) => header.trim());
        headerLine = line;
        break;
    }

    const speakerIndex = headers.indexOf("speaker");
    const roleIdIndex = headers.indexOf("roleId");
    if (headerLine < 0 || speakerIndex < 0) {
        return [];
    }

    const speakers = [];
    for (let line = headerLine + 1; line < lines.length; line += 1) {
        const trimmed = lines[line].trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }

        const parsed = parseCsvRows(lines[line]);
        if (parsed.length === 0) {
            continue;
        }

        const row = parsed[0];
        const name = (row[speakerIndex] || "").trim();
        if (!name) {
            continue;
        }

        speakers.push({
            name,
            roleId: roleIdIndex >= 0 ? (row[roleIdIndex] || "").trim() : "",
            sourcePath: roleMapPath,
            sourceLabel: "Bird role map",
            sourceRank: 0,
            line,
            character: findCsvFieldValueStart(lines[line], speakerIndex, name),
            length: name.length
        });
    }

    return speakers;
}

function findCsvFieldValueStart(line, fieldIndex, fallbackValue) {
    let currentField = 0;
    let fieldStart = 0;
    let inQuotes = false;

    for (let index = 0; index <= line.length; index += 1) {
        const character = index < line.length ? line[index] : ",";
        if (inQuotes) {
            if (character === "\"") {
                if (line[index + 1] === "\"") {
                    index += 1;
                } else {
                    inQuotes = false;
                }
            }
            continue;
        }

        if (character === "\"") {
            inQuotes = true;
        } else if (character === ",") {
            if (currentField === fieldIndex) {
                let start = fieldStart;
                while (start < index && /\s/.test(line[start])) {
                    start += 1;
                }
                if (line[start] === "\"") {
                    start += 1;
                }
                return start;
            }

            currentField += 1;
            fieldStart = index + 1;
        }
    }

    const fallback = line.indexOf(fallbackValue);
    return Math.max(0, fallback);
}

async function readProjectConfig(document) {
    const folder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!folder) {
        return undefined;
    }

    const configPath = path.join(folder.uri.fsPath, "inscape.config.json");
    if (!fs.existsSync(configPath)) {
        return undefined;
    }

    try {
        const text = await fs.promises.readFile(configPath, "utf8");
        return {
            configPath,
            config: JSON.parse(text)
        };
    } catch {
        return undefined;
    }
}

function resolveProjectConfigPath(configPath, value) {
    return path.isAbsolute(value)
        ? value
        : path.resolve(path.dirname(configPath), value);
}

function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (inQuotes) {
            if (character === "\"") {
                if (text[index + 1] === "\"") {
                    field += "\"";
                    index += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += character;
            }
            continue;
        }

        if (character === "\"") {
            inQuotes = true;
        } else if (character === ",") {
            row.push(field);
            field = "";
        } else if (character === "\n") {
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else if (character !== "\r") {
            field += character;
        }
    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter((csvRow) => csvRow.some((fieldValue) => fieldValue.trim().length > 0));
}

function collectSpeakersFromText(text, sourcePath, speakers, seen) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (let line = 0; line < lines.length; line += 1) {
        const match = /^\s*([^:\uFF1A\s][^:\uFF1A]{0,80}?)[ \t]*[:\uFF1A]/.exec(lines[line]);
        if (!match) {
            continue;
        }

        const name = match[1].trim();
        if (!isLikelyDialogueSpeaker(name)) {
            continue;
        }

        addSpeaker(speakers, seen, {
            name,
            roleId: "",
            sourcePath,
            sourceLabel: "Workspace speaker",
            sourceRank: 1,
            line,
            character: getTrimmedMatchStart(lines[line], match[1], name),
            length: name.length
        });
    }
}

async function collectWorkspaceDialogueSpeakerReferences(document, speakerName) {
    const references = [];
    const sources = await collectWorkspaceTextSources(document);

    for (const source of sources) {
        collectDialogueSpeakerReferencesFromText(source.text, source.sourcePath, speakerName, references);
    }

    return references.sort((left, right) => {
        const pathCompare = left.sourcePath.localeCompare(right.sourcePath);
        if (pathCompare !== 0) {
            return pathCompare;
        }
        if (left.line !== right.line) {
            return left.line - right.line;
        }
        return left.character - right.character;
    });
}

function collectDialogueSpeakerReferencesFromText(text, sourcePath, speakerName, references) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (let line = 0; line < lines.length; line += 1) {
        const match = /^\s*([^:\uFF1A\s][^:\uFF1A]{0,80}?)[ \t]*[:\uFF1A]/.exec(lines[line]);
        if (!match) {
            continue;
        }

        const name = match[1].trim();
        if (name !== speakerName || !isLikelyDialogueSpeaker(name)) {
            continue;
        }

        references.push({
            name,
            sourcePath,
            line,
            character: getTrimmedMatchStart(lines[line], match[1], name),
            length: name.length
        });
    }
}

function getTrimmedMatchStart(line, rawMatch, trimmedMatch) {
    const rawStart = Math.max(0, line.indexOf(rawMatch));
    const trimOffset = Math.max(0, rawMatch.indexOf(trimmedMatch));
    return rawStart + trimOffset;
}

function isLikelyDialogueSpeaker(name) {
    return name.length > 0
        && !name.startsWith("::")
        && !name.startsWith("@")
        && !name.startsWith("//")
        && !name.startsWith("->")
        && !name.startsWith("?")
        && !name.startsWith("-")
        && !name.startsWith("[");
}

function addSpeaker(speakers, seen, speaker) {
    const key = speaker.name;
    if (seen.has(key)) {
        return;
    }

    seen.add(key);
    speakers.push(speaker);
}

function createSpeakerCompletionItem(speaker) {
    const item = new vscode.CompletionItem(speaker.name, vscode.CompletionItemKind.Class);
    item.insertText = speaker.name + "\uFF1A";
    item.detail = speaker.roleId
        ? "Bird roleId " + speaker.roleId
        : speaker.sourceLabel + " (unbound)";
    item.documentation = speaker.sourcePath;
    item.sortText = (speaker.sourceRank || 0) + "_" + speaker.name;
    return item;
}

async function collectWorkspaceNodes(document) {
    const nodes = [];
    const seen = new Set();
    const sources = await collectWorkspaceTextSources(document);

    for (const source of sources) {
        collectNodesFromText(source.text, source.sourcePath, seen, nodes);
    }

    return nodes.sort((left, right) => left.name.localeCompare(right.name));
}

async function collectWorkspaceJumpReferences(document, targetName) {
    const references = [];
    const sources = await collectWorkspaceTextSources(document);

    for (const source of sources) {
        collectJumpReferencesFromText(source.text, source.sourcePath, targetName, references);
    }

    return references.sort((left, right) => {
        const pathCompare = left.sourcePath.localeCompare(right.sourcePath);
        if (pathCompare !== 0) {
            return pathCompare;
        }
        if (left.line !== right.line) {
            return left.line - right.line;
        }
        return left.character - right.character;
    });
}

async function collectWorkspaceOutgoingTargets(document, nodeName) {
    const targets = [];
    const sources = await collectWorkspaceTextSources(document);

    for (const source of sources) {
        collectOutgoingTargetsFromText(source.text, source.sourcePath, nodeName, targets);
    }

    return targets.sort((left, right) => {
        const pathCompare = left.sourcePath.localeCompare(right.sourcePath);
        if (pathCompare !== 0) {
            return pathCompare;
        }
        if (left.line !== right.line) {
            return left.line - right.line;
        }
        return left.character - right.character;
    });
}

async function collectWorkspaceTextSources(document) {
    const sources = [];
    const seen = new Set();

    addWorkspaceTextSource(sources, seen, document.uri.fsPath, document.getText());

    for (const textDocument of vscode.workspace.textDocuments) {
        if (isInscapeDocument(textDocument)) {
            addWorkspaceTextSource(sources, seen, textDocument.uri.fsPath, textDocument.getText());
        }
    }

    const files = await vscode.workspace.findFiles("**/*.inscape", "{**/.git/**,**/bin/**,**/obj/**,**/node_modules/**,**/artifacts/**}", 2000);
    for (const file of files) {
        if (seen.has(normalizePath(file.fsPath))) {
            continue;
        }

        const text = await readWorkspaceFileText(file);
        addWorkspaceTextSource(sources, seen, file.fsPath, text);
    }

    return sources;
}

function addWorkspaceTextSource(sources, seen, sourcePath, text) {
    const key = normalizePath(sourcePath);
    if (seen.has(key)) {
        return;
    }

    seen.add(key);
    sources.push({
        sourcePath,
        text
    });
}

async function readWorkspaceFileText(uri) {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return Buffer.from(bytes).toString("utf8");
}

function collectNodesFromText(text, sourcePath, seen, nodes) {
    const pattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    for (let line = 0; line < lines.length; line += 1) {
        const match = pattern.exec(lines[line]);
        if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            nodes.push({
                name: match[1],
                sourcePath,
                line,
                character: Math.max(0, lines[line].indexOf(match[1])),
                length: match[1].length
            });
        }
    }
}

function collectJumpReferencesFromText(text, sourcePath, targetName, references) {
    const pattern = /->\s*([A-Za-z0-9_.-]+)/g;
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    for (let line = 0; line < lines.length; line += 1) {
        if (!isJumpReferenceLine(lines[line])) {
            continue;
        }

        pattern.lastIndex = 0;
        let match = pattern.exec(lines[line]);
        while (match) {
            const target = match[1];
            if (target === targetName) {
                const character = match.index + match[0].length - target.length;
                references.push({
                    name: target,
                    sourcePath,
                    line,
                    character,
                    length: target.length
                });
            }
            match = pattern.exec(lines[line]);
        }
    }
}

function collectOutgoingTargetsFromText(text, sourcePath, nodeName, targets) {
    const nodePattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;
    const jumpPattern = /->\s*([A-Za-z0-9_.-]+)/g;
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    let currentNode = "";

    for (let line = 0; line < lines.length; line += 1) {
        const nodeMatch = nodePattern.exec(lines[line]);
        if (nodeMatch) {
            currentNode = nodeMatch[1];
            continue;
        }

        if (currentNode !== nodeName || !isJumpReferenceLine(lines[line])) {
            continue;
        }

        jumpPattern.lastIndex = 0;
        let jumpMatch = jumpPattern.exec(lines[line]);
        while (jumpMatch) {
            const target = jumpMatch[1];
            const character = jumpMatch.index + jumpMatch[0].length - target.length;
            targets.push({
                name: target,
                sourcePath,
                line,
                character,
                length: target.length
            });
            jumpMatch = jumpPattern.exec(lines[line]);
        }
    }
}

function getNodeNameAtDeclarationPosition(document, position) {
    const node = getNodeDeclarationAtPosition(document, position);
    return node ? node.name : undefined;
}

function getNodeDeclarationAtPosition(document, position) {
    const line = document.lineAt(position).text;
    const match = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/.exec(line);
    if (!match) {
        return undefined;
    }

    const start = line.indexOf(match[1]);
    const end = start + match[1].length;
    if (position.character >= start && position.character <= end) {
        return {
            name: match[1],
            range: new vscode.Range(position.line, start, position.line, end)
        };
    }

    return undefined;
}

function getJumpTargetAtPosition(document, position) {
    const target = getJumpTargetAtPositionInfo(document, position);
    return target ? target.name : undefined;
}

function getJumpTargetAtPositionInfo(document, position) {
    const line = document.lineAt(position).text;
    if (!isJumpReferenceLine(line)) {
        return undefined;
    }

    const jumpPattern = /->\s*([A-Za-z0-9_.-]*)/g;
    let match = jumpPattern.exec(line);

    while (match) {
        const target = match[1];
        const targetStart = match.index + match[0].length - target.length;
        const targetEnd = targetStart + target.length;
        if (position.character >= targetStart && position.character <= targetEnd) {
            return target.length > 0
                ? {
                    name: target,
                    range: new vscode.Range(position.line, targetStart, position.line, targetEnd)
                }
                : undefined;
        }
        match = jumpPattern.exec(line);
    }

    return undefined;
}

function getDialogueSpeakerAtPosition(document, position) {
    const line = document.lineAt(position).text;
    const match = /^\s*([^:\uFF1A]+?)[ \t]*[:\uFF1A]/.exec(line);
    if (!match) {
        return undefined;
    }

    const name = match[1].trim();
    if (!isLikelyDialogueSpeaker(name)) {
        return undefined;
    }

    const start = line.indexOf(match[1]);
    const end = start + match[1].length;
    if (position.character >= start && position.character <= end) {
        return {
            name,
            range: new vscode.Range(position.line, start, position.line, end)
        };
    }

    return undefined;
}

function getHostBindingAtPosition(document, position) {
    const line = document.lineAt(position).text;
    const metadataMatch = /^\s*@timeline(?::|\s+)\s*([^\s\]]+)/.exec(line);
    if (metadataMatch) {
        const alias = metadataMatch[1].trim();
        const aliasStart = line.indexOf(metadataMatch[1], metadataMatch.index);
        const aliasEnd = aliasStart + metadataMatch[1].length;
        if (position.character >= aliasStart && position.character <= aliasEnd) {
            return {
                kind: "timeline",
                alias,
                range: new vscode.Range(position.line, aliasStart, position.line, aliasEnd)
            };
        }
    }

    const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*([^\]\s]+)\]/g;
    let inlineMatch = inlinePattern.exec(line);
    while (inlineMatch) {
        const kind = inlineMatch[1].trim();
        const alias = inlineMatch[2].trim();
        const aliasStart = inlineMatch.index + inlineMatch[0].lastIndexOf(inlineMatch[2]);
        const aliasEnd = aliasStart + inlineMatch[2].length;
        if (position.character >= aliasStart && position.character <= aliasEnd) {
            return {
                kind,
                alias,
                range: new vscode.Range(position.line, aliasStart, position.line, aliasEnd)
            };
        }
        inlineMatch = inlinePattern.exec(line);
    }

    return undefined;
}

function isJumpReferenceLine(line) {
    const trimmed = line.trim();
    return trimmed.startsWith("->") || trimmed.startsWith("-");
}

function createNodeHoverMarkdown(nodeName, declarations, references, outgoingTargets) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Node** `" + nodeName + "`\n\n");

    if (declarations.length === 0) {
        markdown.appendMarkdown("Declaration: not found\n\n");
    } else if (declarations.length === 1) {
        markdown.appendMarkdown("Defined: `" + formatSourceLocation(declarations[0]) + "`\n\n");
    } else {
        markdown.appendMarkdown("Definitions: " + declarations.length + "\n\n");
        for (const declaration of declarations.slice(0, 5)) {
            markdown.appendMarkdown("- `" + formatSourceLocation(declaration) + "`\n");
        }
        if (declarations.length > 5) {
            markdown.appendMarkdown("- ...\n");
        }
        markdown.appendMarkdown("\n");
    }

    markdown.appendMarkdown("References: " + references.length + "\n\n");

    const outgoingNames = uniqueNames(outgoingTargets.map((target) => target.name));
    if (outgoingNames.length === 0) {
        markdown.appendMarkdown("Outgoing: none");
    } else {
        const displayed = outgoingNames.slice(0, 8).map((name) => "`" + name + "`").join(", ");
        const suffix = outgoingNames.length > 8 ? ", ..." : "";
        markdown.appendMarkdown("Outgoing: " + displayed + suffix);
    }

    return markdown;
}

function createSpeakerHoverMarkdown(speaker) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Speaker** `" + speaker.name + "`\n\n");

    if (speaker.roleId) {
        markdown.appendMarkdown("Bird roleId: `" + speaker.roleId + "`\n\n");
    } else {
        markdown.appendMarkdown("Bird roleId: unbound\n\n");
    }

    markdown.appendMarkdown("Source: `" + formatDisplayPath(speaker.sourcePath) + "`");
    return markdown;
}

function createHostBindingHoverMarkdown(binding) {
    return createHostBindingMarkdown(binding);
}

function createHostBindingMarkdown(binding) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Host Binding** `" + binding.kind + ":" + binding.alias + "`\n\n");
    appendHostBindingField(markdown, "Bird id", binding.birdId);
    appendHostBindingField(markdown, "Addressable", binding.addressableKey);
    appendHostBindingField(markdown, "Asset", binding.assetPath);
    appendHostBindingField(markdown, "Unity guid", binding.unityGuid);
    markdown.appendMarkdown("Source: `" + formatDisplayPath(binding.sourcePath) + "`");
    return markdown;
}

function appendHostBindingField(markdown, label, value) {
    if (!value) {
        return;
    }

    markdown.appendMarkdown(label + ": `" + value + "`\n\n");
}

function createLocation(item) {
    return new vscode.Location(
        vscode.Uri.file(item.sourcePath),
        new vscode.Range(item.line, item.character, item.line, item.character + (item.length || 0))
    );
}

function uniqueLocations(locations) {
    const seen = new Set();
    const result = [];

    for (const location of locations) {
        const key = normalizePath(location.uri.fsPath)
            + ":" + location.range.start.line
            + ":" + location.range.start.character
            + ":" + location.range.end.character;
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        result.push(location);
    }

    return result;
}

function uniqueNames(names) {
    const seen = new Set();
    const result = [];

    for (const name of names) {
        if (seen.has(name)) {
            continue;
        }
        seen.add(name);
        result.push(name);
    }

    return result;
}

function formatSourceLocation(item) {
    return formatDisplayPath(item.sourcePath) + ":" + (item.line + 1);
}

function formatDisplayPath(sourcePath) {
    const uri = vscode.Uri.file(sourcePath);
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
        return sourcePath;
    }

    return path.relative(folder.uri.fsPath, sourcePath).replace(/\\/g, "/");
}

function normalizePath(value) {
    return path.resolve(value).toLowerCase();
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}

module.exports = {
    activate,
    deactivate
};
