"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const languageSelector = { language: "inscape" };
let outputChannel;
const previewPanels = new Map();
const previewRefreshTimers = new Map();
const previewRenderCache = new Map();
const previewRenderVersions = new Map();

function activate(context) {
    outputChannel = vscode.window.createOutputChannel("Inscape");
    const diagnostics = vscode.languages.createDiagnosticCollection("inscape");
    const scheduler = new DiagnosticScheduler(context, diagnostics);
    logOutput("Activated Inscape extension from " + context.extensionPath);

    context.subscriptions.push(
        outputChannel,
        diagnostics,
        scheduler,
        vscode.workspace.onDidOpenTextDocument((document) => scheduler.schedule(document)),
        vscode.workspace.onDidChangeTextDocument((event) => {
            scheduler.schedule(event.document);
            schedulePreviewRefresh(context, event.document, 250);
        }),
        vscode.workspace.onDidSaveTextDocument((document) => {
            scheduler.schedule(document, 0);
            refreshPreviewPanelsForDocument(context, document);
        }),
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
        vscode.languages.registerCodeLensProvider(languageSelector, new InscapeCodeLensProvider()),
        vscode.commands.registerCommand("inscape.showNodeIncomingReferences", (uri, position, locations) => showNodeIncomingReferences(uri, position, locations)),
        vscode.commands.registerCommand("inscape.openPreview", () => openPreview(context)),
        vscode.commands.registerCommand("inscape.togglePreview", () => togglePreview(context)),
        vscode.commands.registerCommand("inscape.extractLocalization", () => exportLocalization(context)),
        vscode.commands.registerCommand("inscape.updateLocalization", () => updateLocalization(context)),
        vscode.commands.registerCommand("inscape.showHostSchemaCapabilities", () => showHostSchemaCapabilities()),
        vscode.window.registerCustomEditorProvider(
            "inscape.preview",
            new InscapePreviewEditorProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                },
                supportsMultipleEditorsPerDocument: true
            }
        )
    );

    refreshVisibleDocuments(scheduler);
}

function deactivate() {
}

function logOutput(message) {
    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine("[" + new Date().toISOString() + "] " + message);
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
            if (definitions.length > 0) {
                return definitions.map((definition) => createLocation(definition));
            }

            const references = await collectWorkspaceDialogueSpeakerReferences(document, speakerInfo.name);
            if (references.length > 0) {
                return references.map((reference) => createLocation(reference));
            }
            return undefined;
        }

        const hostBindingInfo = getHostBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await collectWorkspaceHostBindings(document, hostBindingInfo.kind);
            const matchingBindings = bindings.filter((candidate) => candidate.alias === hostBindingInfo.alias)
                .map((candidate) => createLocation(candidate));
            if (matchingBindings.length > 0) {
                return uniqueLocations(matchingBindings);
            }
        }

        const metadataInfo = getMetadataDirectiveAtPosition(document, position);
        if (metadataInfo) {
            const locations = await collectWorkspaceMetadataReferences(document, metadataInfo);
            if (locations.length > 0) {
                return uniqueLocations(locations.map((item) => createLocation(item)));
            }
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

        if (locations.length > 0) {
            return locations;
        }
        return undefined;
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

            return new vscode.Hover(createHostBindingMissingMarkdown({
                kind: hostBindingInfo.kind,
                alias: hostBindingInfo.alias,
                sourcePath: document.uri.fsPath
            }), hostBindingInfo.range);
        }

        const metadataInfo = getMetadataDirectiveAtPosition(document, position);
        if (metadataInfo) {
            return new vscode.Hover(createMetadataHoverMarkdown(metadataInfo), metadataInfo.range);
        }

        const declaredNode = getNodeDeclarationAtPosition(document, position);
        if (declaredNode) {
            return new vscode.Hover(createNodeDeclarationHoverMarkdown(declaredNode.name), declaredNode.range);
        }

        const jumpTarget = getJumpTargetAtPositionInfo(document, position);
        if (jumpTarget) {
            return new vscode.Hover(createJumpTargetHoverMarkdown(jumpTarget.name), jumpTarget.range);
        }

        return undefined;
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
                "Inscape dialogue block",
                vscode.SymbolKind.Namespace,
                range,
                range
            ));
        }

        return symbols;
    }
}

class InscapeCodeLensProvider {

    async provideCodeLenses(document) {
        if (!isInscapeDocument(document)) {
            return [];
        }

        const currentDocumentNodes = collectDocumentNodes(document);
        if (currentDocumentNodes.length === 0) {
            return [];
        }

        const navigation = await collectWorkspaceNodeNavigation(document);
        const codeLenses = [];
        for (const node of currentDocumentNodes) {
            const range = new vscode.Range(node.line, node.character, node.line, node.character + node.length);
            const position = new vscode.Position(node.line, node.character);
            const incoming = navigation.referencesByTarget.get(node.name) || [];

            codeLenses.push(new vscode.CodeLens(range, {
                title: incoming.length + " 个引用",
                command: "inscape.showNodeIncomingReferences",
                arguments: [
                    vscode.Uri.file(node.sourcePath),
                    position,
                    incoming.map((reference) => createLocation(reference))
                ]
            }));
        }

        return codeLenses;
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

async function openPreview(context) {
    const document = await resolvePreviewDocument();
    if (!document) {
        return;
    }

    await vscode.commands.executeCommand("vscode.openWith", document.uri, "inscape.preview", {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
        preview: false
    });
}

async function togglePreview(context) {
    const document = await resolvePreviewDocument();
    if (!document) {
        return;
    }

    const openPreviewTab = findPreviewTabForDocument(document);
    if (openPreviewTab && isActivePreviewTab(openPreviewTab, document)) {
        await vscode.window.tabGroups.close(openPreviewTab, true);
        return;
    }

    await vscode.commands.executeCommand("vscode.openWith", document.uri, "inscape.preview", {
        viewColumn: vscode.ViewColumn.Beside,
        preserveFocus: false,
        preview: false
    });
}

async function resolvePreviewDocument() {
    const activeDocument = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
    if (activeDocument && isInscapeDocument(activeDocument)) {
        return activeDocument;
    }

    const workspaceFolder = await selectWorkspaceFolder();
    if (!workspaceFolder) {
        return undefined;
    }

    const candidates = await vscode.workspace.findFiles("**/*.inscape", "{**/.git/**,**/bin/**,**/obj/**,**/node_modules/**,**/artifacts/**}", 1);
    if (candidates.length === 0) {
        vscode.window.showWarningMessage("Open an .inscape file before opening the Inscape preview.");
        return undefined;
    }

    const document = await vscode.workspace.openTextDocument(candidates[0]);
    return document;
}

async function refreshPreviewPanelsForDocument(context, document) {
    if (!isInscapeDocument(document)) {
        return;
    }

    const panels = previewPanels.get(normalizePath(document.uri.fsPath));
    if (!panels || panels.size === 0) {
        return;
    }

    for (const panel of panels) {
        await refreshPreviewPanel(context, panel, document, false);
    }
}

function findPreviewTabForDocument(document) {
    const targetPath = normalizePath(document.uri.fsPath);
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            if (!input || input.viewType !== "inscape.preview" || !input.uri) {
                continue;
            }

            if (normalizePath(input.uri.fsPath) === targetPath) {
                return tab;
            }
        }
    }

    return undefined;
}

function isActivePreviewTab(tab, document) {
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (!activeTab || activeTab !== tab) {
        return false;
    }

    const input = tab.input;
    return input && input.viewType === "inscape.preview" && input.uri && normalizePath(input.uri.fsPath) === normalizePath(document.uri.fsPath);
}

function schedulePreviewRefresh(context, document, delayOverride) {
    if (!isInscapeDocument(document)) {
        return;
    }

    const sourceKey = normalizePath(document.uri.fsPath);
    const panels = previewPanels.get(sourceKey);
    if (!panels || panels.size === 0) {
        return;
    }

    const existing = previewRefreshTimers.get(sourceKey);
    if (existing) {
        clearTimeout(existing);
    }

    const delay = typeof delayOverride === "number" ? delayOverride : 250;
    previewRefreshTimers.set(sourceKey, setTimeout(() => {
        previewRefreshTimers.delete(sourceKey);
        refreshPreviewPanelsForDocument(context, document);
    }, delay));
}

async function refreshPreviewPanel(context, panel, document, showProgress) {
    const runRefresh = async () => {
        const cacheKey = normalizePath(document.uri.fsPath);
        const documentHash = hashDocumentText(document);
        const cached = previewRenderCache.get(cacheKey);
        if (cached && cached.documentHash === documentHash && cached.html) {
            panel.webview.html = cached.html;
            return;
        }

        const version = (previewRenderVersions.get(cacheKey) || 0) + 1;
        previewRenderVersions.set(cacheKey, version);

        let tempPath;
        const outputPath = createTempPath("preview", ".html");

        try {
            if (document && isInscapeDocument(document)) {
                tempPath = writeTempDocument(document);
            }

            const invocation = createPreviewInvocation(context, document, tempPath, outputPath);
            const result = await execFileDetailedPromise(invocation);

            if (previewRenderVersions.get(cacheKey) !== version) {
                return;
            }

            const hasOutput = fs.existsSync(outputPath);

            if (!hasOutput) {
                throw new Error(getInvocationFailureDetail(result.stderr, result.stdout, "Preview HTML was not generated."));
            }

            const html = await fs.promises.readFile(outputPath, "utf8");
            previewRenderCache.set(cacheKey, {
                documentHash,
                html
            });
            panel.webview.html = html;

            if (result.exitCode !== 0) {
                const detail = getInvocationFailureDetail(result.stderr, result.stdout, "Preview rendered with compiler diagnostics.");
                logOutput("Preview rendered with diagnostics for " + document.uri.fsPath + ": " + detail);
                if (showProgress) {
                    vscode.window.showWarningMessage("Inscape preview已刷新，但包含编译诊断。详情见 Problems 或输出面板。");
                }
            }
        } finally {
            if (tempPath) {
                fs.unlink(tempPath, () => { });
            }

            fs.unlink(outputPath, () => { });
        }
    };

    try {
        if (showProgress) {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Opening Inscape preview",
                cancellable: false
            }, runRefresh);
        } else {
            await runRefresh();
        }
    } catch (error) {
        logOutput("Preview refresh failed: " + (error.message || String(error)));
        panel.webview.html = createPreviewErrorHtml(error.message || String(error));
        vscode.window.showErrorMessage(error.message || String(error));
    }
}

function createPreviewInvocation(context, document, tempPath, outputPath) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceFolderPath = workspaceFolder ? workspaceFolder.uri.fsPath : getWorkspaceFolder(context, document);
    const configuration = vscode.workspace.getConfiguration("inscape", workspaceFolder ? workspaceFolder.uri : document.uri);
    const cliProject = resolveCliProjectPath(context, workspaceFolderPath);
    const invocation = resolveCliInvocation(configuration.get("compiler.command", "dotnet"), cliProject, workspaceFolderPath);
    const args = invocation.args.slice();

    if (document && tempPath) {
        args.push("--override", document.uri.fsPath, tempPath);
    }

    args.push("-o", outputPath);

    return {
        command: invocation.command,
        args,
        cwd: workspaceFolderPath
    };
}

function resolveCliInvocation(defaultCommand, cliProject, workspaceFolderPath) {
    const cliExecutable = resolveCliExecutablePath(cliProject);
    if (cliExecutable) {
        return {
            command: cliExecutable,
            args: ["preview-project", workspaceFolderPath]
        };
    }

    const cliAssembly = resolveCliAssemblyPath(workspaceFolderPath, cliProject);
    if (cliAssembly && fs.existsSync(cliAssembly)) {
        return {
            command: defaultCommand,
            args: ["exec", cliAssembly, "preview-project", workspaceFolderPath]
        };
    }

    return {
        command: defaultCommand,
        args: ["run", "--project", cliProject, "--", "preview-project", workspaceFolderPath]
    };
}

function resolveCliExecutablePath(cliProject) {
    const projectDirectory = path.dirname(cliProject);
    const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
    const candidateConfigurations = ["Debug", "Release"];
    const executableName = process.platform === "win32" ? "Inscape.Cli.exe" : "Inscape.Cli";

    for (const configuration of candidateConfigurations) {
        for (const framework of candidateFrameworks) {
            const candidate = path.join(projectDirectory, "bin", configuration, framework, executableName);
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return undefined;
}

function resolveCliAssemblyPath(workspaceFolderPath, cliProject) {
    const projectDirectory = path.dirname(cliProject);
    const candidateFrameworks = ["net10.0", "net9.0", "net8.0"];
    const candidateConfigurations = ["Debug", "Release"];

    for (const configuration of candidateConfigurations) {
        for (const framework of candidateFrameworks) {
            const candidate = path.join(projectDirectory, "bin", configuration, framework, "Inscape.Cli.dll");
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
    }

    return undefined;
}

function hashDocumentText(document) {
    return crypto.createHash("sha1").update(document.getText(), "utf8").digest("hex");
}

class InscapePreviewEditorProvider {

    constructor(context) {
        this.context = context;
    }

    resolveCustomTextEditor(document, webviewPanel) {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        const sourceKey = normalizePath(document.uri.fsPath);
        if (!previewPanels.has(sourceKey)) {
            previewPanels.set(sourceKey, new Set());
        }

        const panels = previewPanels.get(sourceKey);
        panels.add(webviewPanel);

        webviewPanel.title = "Inscape Preview · " + path.basename(document.uri.fsPath);
        webviewPanel.webview.html = createPreviewLoadingHtml(path.basename(document.uri.fsPath));

        webviewPanel.onDidDispose(() => {
            const currentPanels = previewPanels.get(sourceKey);
            if (!currentPanels) {
                return;
            }

            currentPanels.delete(webviewPanel);
            if (currentPanels.size === 0) {
                previewPanels.delete(sourceKey);
            }
        });

        webviewPanel.webview.onDidReceiveMessage((message) => {
            if (!message || message.type !== "openSource" || !message.source || !message.source.sourcePath) {
                return;
            }

            openPreviewSource(message.source);
        });

        refreshPreviewPanel(this.context, webviewPanel, document, true);
    }

}

function createTempPath(prefix, extension) {
    const directory = path.join(os.tmpdir(), "inscape-vscode");
    fs.mkdirSync(directory, { recursive: true });

    const fileName = prefix
        + "-"
        + process.pid
        + "-"
        + Date.now()
        + "-"
        + Math.random().toString(16).slice(2)
        + extension;

    return path.join(directory, fileName);
}

function createPreviewLoadingHtml(workspaceName) {
    return [
        "<!DOCTYPE html>",
        "<html lang=\"zh-CN\">",
        "<head>",
        "  <meta charset=\"utf-8\" />",
        "  <title>Inscape Preview</title>",
        "  <style>",
        "    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; }",
        "    .card { max-width: 640px; border: 1px solid var(--vscode-panel-border); border-radius: 10px; padding: 16px 18px; background: var(--vscode-sideBar-background); }",
        "    h1 { font-size: 18px; margin: 0 0 8px; }",
        "    p { margin: 0; opacity: 0.85; line-height: 1.5; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <div class=\"card\">",
        "    <h1>正在生成预览</h1>",
        "    <p>工作区：" + escapeHtml(workspaceName) + "</p>",
        "  </div>",
        "</body>",
        "</html>"
    ].join("\n");
}

function createPreviewErrorHtml(message) {
    return [
        "<!DOCTYPE html>",
        "<html lang=\"zh-CN\">",
        "<head>",
        "  <meta charset=\"utf-8\" />",
        "  <title>Inscape Preview Error</title>",
        "  <style>",
        "    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-editor-background); padding: 24px; }",
        "    .card { max-width: 760px; border: 1px solid var(--vscode-errorForeground); border-radius: 10px; padding: 16px 18px; background: var(--vscode-inputValidation-errorBackground); }",
        "    h1 { font-size: 18px; margin: 0 0 8px; color: var(--vscode-errorForeground); }",
        "    pre { white-space: pre-wrap; margin: 0; line-height: 1.5; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <div class=\"card\">",
        "    <h1>预览生成失败</h1>",
        "    <pre>" + escapeHtml(message) + "</pre>",
        "  </div>",
        "</body>",
        "</html>"
    ].join("\n");
}

async function openPreviewSource(source) {
    try {
        const location = new vscode.Location(
            vscode.Uri.file(source.sourcePath),
            new vscode.Range(
                Math.max(0, (source.line || 0)),
                Math.max(0, (source.column || 0)),
                Math.max(0, (source.line || 0)),
                Math.max(0, (source.column || 0) + 1)
            )
        );
        await openLocation(location);
    } catch (error) {
        vscode.window.showErrorMessage(error.message || String(error));
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
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

async function showHostSchemaCapabilities() {
    const workspaceFolder = await selectWorkspaceFolder();
    if (!workspaceFolder) {
        return;
    }

    let schema;
    try {
        schema = await readConfiguredHostSchema(workspaceFolder);
    } catch (error) {
        vscode.window.showErrorMessage(error.message || String(error));
        return;
    }

    if (!schema) {
        vscode.window.showWarningMessage("Configure hostSchema in inscape.config.json before listing host capabilities.");
        return;
    }

    const items = createHostSchemaQuickPickItems(schema);
    if (items.length === 0) {
        vscode.window.showInformationMessage("Host schema has no queries or events.");
        return;
    }

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select an Inscape host query or event"
    });
    if (!selected || !selected.location) {
        return;
    }

    await openLocation(locationFromPayload(selected.location));
}

async function readConfiguredHostSchema(workspaceFolder) {
    const projectConfig = await readProjectConfigFromWorkspaceFolder(workspaceFolder);
    if (!projectConfig || !projectConfig.configPath || !projectConfig.config) {
        return undefined;
    }

    const configuredPath = projectConfig.config.hostSchema;
    if (!configuredPath) {
        return undefined;
    }

    const schemaPath = resolveProjectConfigPath(projectConfig.configPath, configuredPath);
    if (!fs.existsSync(schemaPath)) {
        throw new Error("Host schema not found: " + schemaPath);
    }

    const text = await fs.promises.readFile(schemaPath, "utf8");
    const parsed = JSON.parse(text);
    return {
        schemaPath,
        text,
        schema: parsed
    };
}

function createHostSchemaQuickPickItems(schemaInfo) {
    const items = [];
    const queries = Array.isArray(schemaInfo.schema.queries) ? schemaInfo.schema.queries : [];
    const events = Array.isArray(schemaInfo.schema.events) ? schemaInfo.schema.events : [];

    for (const query of queries) {
        if (!query || !query.name) {
            continue;
        }

        const location = findHostSchemaCapabilityLocation(schemaInfo, "queries", query.name);
        items.push({
            label: query.name,
            description: "query -> " + (query.returnType || "unknown"),
            detail: formatHostSchemaParameters(query.parameters) + formatHostSchemaDescription(query.description),
            location
        });
    }

    for (const event of events) {
        if (!event || !event.name) {
            continue;
        }

        const location = findHostSchemaCapabilityLocation(schemaInfo, "events", event.name);
        items.push({
            label: event.name,
            description: "event / " + (event.delivery || "fire-and-forget"),
            detail: formatHostSchemaParameters(event.parameters) + formatHostSchemaDescription(event.description),
            location
        });
    }

    return items.sort((left, right) => {
        const descriptionCompare = left.description.localeCompare(right.description);
        return descriptionCompare !== 0 ? descriptionCompare : left.label.localeCompare(right.label);
    });
}

function formatHostSchemaParameters(parameters) {
    if (!Array.isArray(parameters) || parameters.length === 0) {
        return "()";
    }

    return "(" + parameters.map((parameter) => {
        const name = parameter && parameter.name ? parameter.name : "?";
        const type = parameter && parameter.type ? parameter.type : "unknown";
        const optional = parameter && parameter.required === false ? "?" : "";
        return name + optional + ": " + type;
    }).join(", ") + ")";
}

function formatHostSchemaDescription(description) {
    return description ? " - " + description : "";
}

function findHostSchemaCapabilityLocation(schemaInfo, sectionName, capabilityName) {
    const lines = schemaInfo.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const sectionPattern = new RegExp("\"" + escapeRegExp(sectionName) + "\"\\s*:");
    const nextSectionPattern = sectionName === "queries"
        ? /"events"\s*:/
        : /"queries"\s*:/;
    let inSection = false;

    for (let line = 0; line < lines.length; line += 1) {
        if (!inSection && sectionPattern.test(lines[line])) {
            inSection = true;
            continue;
        }

        if (inSection && nextSectionPattern.test(lines[line])) {
            break;
        }

        if (!inSection) {
            continue;
        }

        const nameIndex = lines[line].indexOf("\"name\"");
        if (nameIndex < 0) {
            continue;
        }

        const valueIndex = lines[line].indexOf("\"" + capabilityName + "\"", nameIndex);
        if (valueIndex >= 0) {
            return {
                sourcePath: schemaInfo.schemaPath,
                line,
                character: valueIndex + 1,
                length: capabilityName.length
            };
        }
    }

    return {
        sourcePath: schemaInfo.schemaPath,
        line: 0,
        character: 0,
        length: 0
    };
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

function execFileDetailedPromise(invocation) {
    return new Promise((resolve, reject) => {
        childProcess.execFile(invocation.command, invocation.args, {
            cwd: invocation.cwd,
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 8
        }, (error, stdout, stderr) => {
            if (error && typeof error.code !== "number") {
                reject(new Error(getInvocationFailureDetail(stderr, stdout, error.message)));
                return;
            }

            resolve({
                exitCode: error ? error.code : 0,
                stdout: stdout || "",
                stderr: stderr || ""
            });
        });
    });
}

function getInvocationFailureDetail(stderr, stdout, fallbackMessage) {
    if (stderr && stderr.trim()) {
        return stderr.trim();
    }

    if (stdout && stdout.trim()) {
        return stdout.trim();
    }

    return fallbackMessage;
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

function showNodeIncomingReferences(uri, position, locations) {
    if (!locations || locations.length === 0) {
        vscode.window.showInformationMessage("This Inscape node has no incoming jumps.");
        return;
    }

    vscode.commands.executeCommand("editor.action.showReferences", uri, position, locations);
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
    if (/^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*[^\s\]]*$/.test(linePrefix)) {
        return { kind: "timeline" };
    }

    const openBracket = linePrefix.lastIndexOf("[");
    const closeBracket = linePrefix.lastIndexOf("]");
    if (openBracket <= closeBracket) {
        return undefined;
    }

    const body = linePrefix.slice(openBracket + 1);
    const match = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*[^\]]*$/.exec(body);
    return match ? { kind: normalizeHostBindingKind(match[1]) } : undefined;
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
    if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.unitySample) {
        return [];
    }

    const bindingMap = projectConfig.config.unitySample.bindingMap;
    if (!bindingMap) {
        return [];
    }

    const bindingMapPath = resolveProjectConfigPath(projectConfig.configPath, bindingMap);
    if (!fs.existsSync(bindingMapPath)) {
        return [];
    }

    const text = await fs.promises.readFile(bindingMapPath, "utf8");
    const sourceLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    const rows = parseCsvRows(text).filter((row) => !(row[0] || "").trim().startsWith("#"));
    if (rows.length === 0) {
        return [];
    }

    const headers = rows[0].map((header) => header.trim());
    const hasHeader = headers.includes("kind") && headers.includes("alias");
    const kindIndex = hasHeader ? headers.indexOf("kind") : 0;
    const aliasIndex = hasHeader ? headers.indexOf("alias") : 1;
    const unitySampleIdIndex = hasHeader ? headers.indexOf("unitySampleId") : 2;
    const unityGuidIndex = hasHeader ? headers.indexOf("unityGuid") : 3;
    const addressableKeyIndex = hasHeader ? headers.indexOf("addressableKey") : 4;
    const assetPathIndex = hasHeader ? headers.indexOf("assetPath") : 5;
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows
        .map((row, index) => {
            const line = hasHeader ? index + 1 : index;
            const lineText = sourceLines[line] || row.join(",");
            const alias = (row[aliasIndex] || "").trim();
            return {
            kind: (row[kindIndex] || "").trim(),
            alias,
            unitySampleId: readOptionalCsvField(row, unitySampleIdIndex),
            unityGuid: readOptionalCsvField(row, unityGuidIndex),
            addressableKey: readOptionalCsvField(row, addressableKeyIndex),
            assetPath: readOptionalCsvField(row, assetPathIndex),
            sourcePath: bindingMapPath,
            sourceLabel: "UnitySample binding map",
            sourceRank: 0,
            line,
            character: 0,
            length: Math.max(alias.length, lineText.length)
        };
        })
        .filter((binding) => binding.kind.length > 0 && binding.alias.length > 0);
}

function readOptionalCsvField(row, index) {
    return index >= 0 && index < row.length ? (row[index] || "").trim() : "";
}

function collectHostBindingsFromText(text, sourcePath, requestedKind, bindings, seen) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const metadataMatch = /^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*([^\s\]]+)/.exec(line);
        if (requestedKind === "timeline" && metadataMatch) {
            const alias = metadataMatch[1].trim();
            const start = line.indexOf(alias, metadataMatch.index);
            addHostBinding(bindings, seen, {
                kind: "timeline",
                alias,
                unitySampleId: "",
                unityGuid: "",
                addressableKey: "",
                assetPath: "",
                sourcePath,
                sourceLabel: "Workspace timeline hook",
                sourceRank: 1,
                line: lineIndex,
                character: Math.max(0, start),
                length: Math.max(alias.length, 1)
            });
        }

        const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*([^\]\s]+)\]/g;
        let inlineMatch = inlinePattern.exec(line);
        while (inlineMatch) {
            const kind = normalizeHostBindingKind(inlineMatch[1].trim());
            const alias = inlineMatch[2].trim();
            if (kind === requestedKind && alias.length > 0) {
                const aliasStart = inlineMatch.index + inlineMatch[0].lastIndexOf(inlineMatch[2]);
                addHostBinding(bindings, seen, {
                    kind,
                    alias,
                    unitySampleId: "",
                    unityGuid: "",
                    addressableKey: "",
                    assetPath: "",
                    sourcePath,
                    sourceLabel: "Workspace inline tag",
                    sourceRank: 1,
                    line: lineIndex,
                    character: Math.max(0, aliasStart),
                    length: Math.max(alias.length, 1)
                });
            }
            inlineMatch = inlinePattern.exec(line);
        }
    }
}

async function collectWorkspaceMetadataReferences(document, metadataInfo) {
    const references = [];
    const sources = await collectWorkspaceTextSources(document);
    for (const source of sources) {
        collectMetadataReferencesFromText(source.text, source.sourcePath, metadataInfo, references);
    }
    return references;
}

function collectMetadataReferencesFromText(text, sourcePath, metadataInfo, references) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const match = /^\s*@([A-Za-z_][A-Za-z0-9_.-]*)(?:\s+([^\s]+))?/.exec(line);
        if (!match) {
            continue;
        }

        const kind = match[1].trim();
        const value = match[2] ? match[2].trim() : "";
        const raw = line.trim();
        if (raw !== metadataInfo.raw && (kind !== metadataInfo.kind || value !== metadataInfo.value)) {
            continue;
        }

        const start = line.indexOf("@" + kind);
        references.push({
            sourcePath,
            line: lineIndex,
            character: Math.max(0, start),
            length: Math.max(line.trimEnd().length - Math.max(0, start), 1)
        });
    }
}

function normalizeHostBindingKind(kind) {
    if (kind === "timeline" || /^timeline\.(?:talking|node)\.(?:enter|exit)$/.test(kind)) {
        return "timeline";
    }

    return kind;
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
    if (binding.unitySampleId) {
        pieces.push("UnitySample " + binding.unitySampleId);
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
    if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.unitySample) {
        return undefined;
    }

    const roleMap = projectConfig.config.unitySample.roleMap;
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
            sourceLabel: "UnitySample role map",
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

    return readProjectConfigFromWorkspaceFolder(folder);
}

async function readProjectConfigFromWorkspaceFolder(folder) {
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
        ? "UnitySample roleId " + speaker.roleId
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

function collectDocumentNodes(document) {
    const nodes = [];
    collectNodesFromText(document.getText(), document.uri.fsPath, new Set(), nodes);
    return nodes;
}

async function collectWorkspaceNodeNavigation(document) {
    const declarations = [];
    const declarationSeen = new Set();
    const referencesByTarget = new Map();
    const sources = await collectWorkspaceTextSources(document);

    for (const source of sources) {
        collectNodesFromText(source.text, source.sourcePath, declarationSeen, declarations);
        collectNodeNavigationFromText(source.text, source.sourcePath, referencesByTarget);
    }

    return {
        declarations,
        referencesByTarget
    };
}

function collectNodeNavigationFromText(text, sourcePath, referencesByTarget) {
    const jumpPattern = /->\s*([A-Za-z0-9_.-]+)/g;
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    for (let line = 0; line < lines.length; line += 1) {
        if (!isJumpReferenceLine(lines[line])) {
            continue;
        }

        jumpPattern.lastIndex = 0;
        let jumpMatch = jumpPattern.exec(lines[line]);
        while (jumpMatch) {
            const target = jumpMatch[1];
            const character = jumpMatch.index + jumpMatch[0].length - target.length;
            const reference = {
                name: target,
                sourcePath,
                line,
                character,
                length: target.length
            };

            addToMapList(referencesByTarget, target, reference);

            jumpMatch = jumpPattern.exec(lines[line]);
        }
    }
}

function addToMapList(map, key, value) {
    if (!map.has(key)) {
        map.set(key, []);
    }
    map.get(key).push(value);
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
    const metadataMatch = /^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*([^\s\]]+)/.exec(line);
    if (metadataMatch) {
        const alias = metadataMatch[1].trim();
        const bindingStart = line.indexOf("@timeline", metadataMatch.index);
        const bindingEnd = Math.min(line.length, metadataMatch.index + metadataMatch[0].length);
        if (position.character >= bindingStart && position.character <= bindingEnd) {
            return {
                kind: "timeline",
                alias,
                range: new vscode.Range(position.line, bindingStart, position.line, bindingEnd)
            };
        }
    }

    const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*([^\]\s]+)\]/g;
    let inlineMatch = inlinePattern.exec(line);
    while (inlineMatch) {
        const kind = normalizeHostBindingKind(inlineMatch[1].trim());
        const alias = inlineMatch[2].trim();
        const bindingStart = inlineMatch.index;
        const bindingEnd = inlineMatch.index + inlineMatch[0].length;
        if (position.character >= bindingStart && position.character <= bindingEnd) {
            return {
                kind,
                alias,
                range: new vscode.Range(position.line, bindingStart, position.line, bindingEnd)
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

function createNodeDeclarationHoverMarkdown(nodeName) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Dialogue Block** `" + nodeName + "`\n\n");
    markdown.appendMarkdown("A named dialogue block. Its CodeLens shows incoming references.");
    return markdown;
}

function createJumpTargetHoverMarkdown(nodeName) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Dialogue Block Reference** `" + nodeName + "`\n\n");
    markdown.appendMarkdown("Ctrl+Click to jump to this dialogue block.");
    return markdown;
}

function createSpeakerHoverMarkdown(speaker) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Speaker** `" + speaker.name + "`\n\n");

    if (speaker.roleId) {
        markdown.appendMarkdown("UnitySample roleId: `" + speaker.roleId + "`\n\n");
    } else {
        markdown.appendMarkdown("UnitySample roleId: unbound\n\n");
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
    markdown.appendMarkdown("This is a host bridge hint. Ctrl+Click opens the configured mapping row or the first workspace occurrence.\n\n");
    appendHostBindingField(markdown, "UnitySample id", binding.unitySampleId);
    appendHostBindingField(markdown, "Addressable", binding.addressableKey);
    appendHostBindingField(markdown, "Asset", binding.assetPath);
    appendHostBindingField(markdown, "Unity guid", binding.unityGuid);
    markdown.appendMarkdown("Source: `" + formatDisplayPath(binding.sourcePath) + "`");
    return markdown;
}

function createHostBindingMissingMarkdown(binding) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Host Binding** `" + binding.kind + ":" + binding.alias + "`\n\n");
    markdown.appendMarkdown("This looks like a host bridge hint, but no mapping row or scanned workspace occurrence was found yet.\n\n");
    markdown.appendMarkdown("Add it to `inscape.config.json` or the binding CSV to make Ctrl+Click resolve it.\n\n");
    markdown.appendMarkdown("Source: `" + formatDisplayPath(binding.sourcePath) + "`");
    return markdown;
}

function createMetadataHoverMarkdown(metadataInfo) {
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = false;
    markdown.appendMarkdown("**Inscape Metadata** `" + metadataInfo.raw + "`\n\n");

    if (metadataInfo.kind === "entry") {
        markdown.appendMarkdown("Marks the entry node for preview / project startup. It does not change dialogue text; it tells the compiler and preview where to begin.\n\n");
    } else if (metadataInfo.kind === "scene") {
        markdown.appendMarkdown("Scene metadata. Use it to label or group a block for host-side logic, asset loading, or authoring conventions.\n\n");
    } else {
        markdown.appendMarkdown("Generic `@` metadata line. Inscape keeps these as lightweight author-intent markers so hosts and adapters can interpret them later.\n\n");
    }

    if (metadataInfo.value) {
        markdown.appendMarkdown("Value: `" + metadataInfo.value + "`\n\n");
    }

    markdown.appendMarkdown("Tip: `@timeline ...` is a host binding hint; `[` `kind: alias` `]` is the inline equivalent.");
    return markdown;
}

function appendHostBindingField(markdown, label, value) {
    if (!value) {
        return;
    }

    markdown.appendMarkdown(label + ": `" + value + "`\n\n");
}

function getMetadataDirectiveAtPosition(document, position) {
    const line = document.lineAt(position).text;
    const match = /^\s*@([A-Za-z_][A-Za-z0-9_.-]*)(?:\s+([^\s]+))?/.exec(line);
    if (!match) {
        return undefined;
    }

    const kind = match[1].trim();
    const value = match[2] ? match[2].trim() : "";
    const start = line.indexOf("@" + match[1]);
    const end = line.trimEnd().length;

    if (position.character >= start && position.character <= Math.max(start, end)) {
        return {
            kind,
            value,
            raw: line.trim(),
            range: new vscode.Range(position.line, start, position.line, Math.max(start, end))
        };
    }

    return undefined;
}

function createLocation(item) {
    return new vscode.Location(
        vscode.Uri.file(item.sourcePath),
        new vscode.Range(item.line, item.character, item.line, item.character + (item.length || 0))
    );
}

function locationPayloadFromItem(item) {
    return {
        sourcePath: item.sourcePath,
        line: item.line,
        character: item.character,
        length: item.length || 0
    };
}

function locationFromPayload(payload) {
    return createLocation(payload);
}

async function openLocation(location) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document);
    editor.selection = new vscode.Selection(location.range.start, location.range.end);
    editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}

module.exports = {
    activate,
    deactivate
};
