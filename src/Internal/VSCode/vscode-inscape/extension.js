"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { PreviewRevealBridge } = require("./Bridges/PreviewRevealBridge");
const { HostSchemaCommand } = require("./Commands/HostSchemaCommand");
const { LocalizationCommand } = require("./Commands/LocalizationCommand");
const { PreviewCommand } = require("./Commands/PreviewCommand");
const { EditorAuthoringCommand } = require("./Commands/EditorAuthoringCommand");
const { HostBindingProvider } = require("./WorkspaceIndex/HostBindingProvider");
const { DslScriptMetadataProvider } = require("./WorkspaceIndex/DslScriptMetadataProvider");
const { DslScriptNodeProvider } = require("./WorkspaceIndex/DslScriptNodeProvider");
const { DslScriptSpeakerProvider } = require("./WorkspaceIndex/DslScriptSpeakerProvider");

const languageSelector = { language: "inscape" };
let outputChannel;
const previewPanels = new Map();
const previewRefreshTimers = new Map();
const previewRenderCache = new Map();
const previewRenderVersions = new Map();
const editorStyleStates = new Map();
const editorStyleFileNames = new Set(["inscape.config.json", "inscape.editor-style.json", "inscape.preview-style.json"]);
const defaultEditorStyle = Object.freeze({
    nodeNameColor: "#d7ba7d",
    speakerColor: "#569cd6",
    speakerFontWeight: "600",
    speakerTextDecoration: "",
    dialogueColor: "#dcdcaa",
    dialogueTextDecoration: "",
    narrationColor: "#dcdcaa",
    choicePromptColor: "#c586c0",
    choicePromptTextDecoration: "none",
    choiceTextColor: "#dcdcaa",
    choiceTextDecoration: "none",
    jumpTargetColor: "#4ec9b0",
    metadataColor: "#6a9955",
    inlineTagColor: "#6a9955"
});
const defaultPreviewStyle = Object.freeze({
    fontFamily: "Inter, \"Segoe UI\", sans-serif",
    pageBackground: "#f6f4ee",
    textColor: "#211d18",
    cardBackground: "#fbfaf6",
    nodeTitleColor: "#8d846f",
    mutedTextColor: "#8d8068",
    toolbarButtonBackground: "#ece7db",
    toolbarButtonHoverBackground: "#e1dacb",
    sourceButtonBackground: "#efeadf",
    sourceButtonHoverBackground: "#e2dccd",
    metaBackground: "#efeadf",
    metaTextColor: "#706754",
    speakerColor: "#7d5a34",
    choiceBackground: "#efeadf",
    choicePromptColor: "#807663",
    diagnosticBackground: "#f2e6de",
    diagnosticTextColor: "#7f2f18",
    storyFontSize: "28px",
    storyLineHeight: "1.84",
    cardRadius: "24px",
    choiceRadius: "16px"
});

let previewCommand;
let localizationCommand;
let editorAuthoringCommand;
let hostSchemaCommand;

const dslScriptNodeProvider = new DslScriptNodeProvider({
    vscode,
    collectWorkspaceTextSources,
    isJumpReferenceLine
});

const dslScriptSpeakerProvider = new DslScriptSpeakerProvider({
    vscode,
    fs,
    readProjectConfig,
    resolveProjectConfigPath,
    parseCsvRows,
    collectWorkspaceTextSources,
    isLikelyDialogueSpeaker,
    formatDisplayPath
});

const hostBindingProvider = new HostBindingProvider({
    vscode,
    fs,
    readProjectConfig,
    resolveProjectConfigPath,
    parseCsvRows,
    collectWorkspaceTextSources,
    normalizeHostBindingKind,
    formatDisplayPath
});

const dslScriptMetadataProvider = new DslScriptMetadataProvider({
    vscode,
    collectWorkspaceTextSources
});

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
            refreshEditorStylesForDocument(context, event.document);
        }),
        vscode.workspace.onDidSaveTextDocument((document) => {
            scheduler.schedule(document, 0);
            refreshPreviewPanelsForDocument(context, document);
            refreshEditorStylesForDocument(context, document);
            handleStyleSupportDocumentSave(context, document);
        }),
        vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
        vscode.window.onDidChangeTextEditorSelection((event) => previewRevealBridge.handleSelectionChange(context, event)),
        vscode.window.onDidChangeVisibleTextEditors(() => refreshEditorStylesForVisibleEditors(context)),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("inscape")) {
                refreshVisibleDocuments(scheduler);
                refreshEditorStylesForVisibleEditors(context);
            }
        }),
        vscode.languages.registerCompletionItemProvider(languageSelector, new DslScriptCompletionProvider(), ">", ".", ":", "\uFF1A", "[", " "),
        vscode.languages.registerDocumentSymbolProvider(languageSelector, new DslScriptDocumentSymbolProvider()),
        vscode.languages.registerDefinitionProvider(languageSelector, new DslScriptDefinitionProvider()),
        vscode.languages.registerReferenceProvider(languageSelector, new DslScriptReferenceProvider()),
        vscode.languages.registerHoverProvider(languageSelector, new DslScriptHoverProvider()),
        vscode.languages.registerCodeLensProvider(languageSelector, new DslScriptCodeLensProvider()),
        vscode.commands.registerCommand("inscape.showNodeIncomingReferences", (uri, position, locations) => showNodeIncomingReferences(uri, position, locations)),
        vscode.commands.registerCommand("inscape.openPreview", () => previewCommand.open()),
        vscode.commands.registerCommand("inscape.togglePreview", () => previewCommand.toggle()),
        vscode.commands.registerCommand("inscape.revealSelectionInPreview", () => previewCommand.revealSelection(context)),
        vscode.commands.registerCommand("inscape.openToolsMenu", () => editorAuthoringCommand.openMenu(context)),
        vscode.commands.registerCommand("inscape.openEditorStyle", () => editorAuthoringCommand.openEditorStyle()),
        vscode.commands.registerCommand("inscape.openPreviewStyle", () => editorAuthoringCommand.openPreviewStyle()),
        vscode.commands.registerCommand("inscape.openQuickSyntaxGuide", () => editorAuthoringCommand.openQuickSyntaxGuide()),
        vscode.commands.registerCommand("inscape.revealInPreview", (payload) => previewRevealBridge.reveal(context, payload)),
        vscode.commands.registerCommand("inscape.extractLocalization", () => localizationCommand.export(context)),
        vscode.commands.registerCommand("inscape.updateLocalization", () => localizationCommand.update(context)),
        vscode.commands.registerCommand("inscape.showHostSchemaCapabilities", () => hostSchemaCommand.showCapabilities()),
        vscode.window.registerCustomEditorProvider(
            "inscape.preview",
            new PreviewEditorProvider(context),
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                },
                supportsMultipleEditorsPerDocument: true
            }
        )
    );

    refreshVisibleDocuments(scheduler);
    refreshEditorStylesForVisibleEditors(context);
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

class DslScriptCompletionProvider {

    async provideCompletionItems(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (isJumpTargetContext(linePrefix)) {
            const nodes = await dslScriptNodeProvider.collectWorkspaceNodes(document);
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

        const hostBindingContext = hostBindingProvider.getBindingCompletionContext(linePrefix);
        if (hostBindingContext) {
            const bindings = await hostBindingProvider.collectWorkspaceBindings(document, hostBindingContext.kind);
            return bindings.map((binding) => hostBindingProvider.createCompletionItem(binding));
        }

        if (isSpeakerCompletionContext(linePrefix)) {
            const speakers = await dslScriptSpeakerProvider.collectWorkspaceSpeakers(document);
            return speakers.map((speaker) => dslScriptSpeakerProvider.createCompletionItem(speaker));
        }

        return undefined;
    }
}

class DslScriptDefinitionProvider {

    async provideDefinition(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const definitions = await dslScriptSpeakerProvider.collectConfiguredDefinitions(document, speakerInfo.name);
            if (definitions.length > 0) {
                return definitions.map((definition) => createLocation(definition));
            }

            const references = await dslScriptSpeakerProvider.collectWorkspaceReferences(document, speakerInfo.name);
            if (references.length > 0) {
                return references.map((reference) => createLocation(reference));
            }
            return undefined;
        }

        const hostBindingInfo = hostBindingProvider.getBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await hostBindingProvider.collectWorkspaceBindings(document, hostBindingInfo.kind);
            const matchingBindings = bindings.filter((candidate) => candidate.alias === hostBindingInfo.alias)
                .map((candidate) => createLocation(candidate));
            if (matchingBindings.length > 0) {
                return uniqueLocations(matchingBindings);
            }
        }

        const metadataInfo = dslScriptMetadataProvider.getDirectiveAtPosition(document, position);
        if (metadataInfo) {
            const locations = await dslScriptMetadataProvider.collectWorkspaceReferences(document, metadataInfo);
            if (locations.length > 0) {
                return uniqueLocations(locations.map((item) => createLocation(item)));
            }
        }

        const previewRevealInfo = previewRevealBridge.getRevealInfoAtPosition(document, position);
        if (previewRevealInfo) {
            previewRevealBridge.rememberDefinition(document, previewRevealInfo);
            return [previewRevealBridge.createDefinitionLink(document, previewRevealInfo)];
        }

        const target = dslScriptNodeProvider.getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const nodes = await dslScriptNodeProvider.collectWorkspaceNodes(document);
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

class DslScriptReferenceProvider {

    async provideReferences(document, position, context) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const references = await dslScriptSpeakerProvider.collectWorkspaceReferences(document, speakerInfo.name);
            let locations = references.map((reference) => createLocation(reference));

            if (context && context.includeDeclaration) {
                const definitions = await dslScriptSpeakerProvider.collectConfiguredDefinitions(document, speakerInfo.name);
                locations = definitions.map((definition) => createLocation(definition)).concat(locations);
            }

            locations = uniqueLocations(locations);
            return locations.length > 0 ? locations : undefined;
        }

        const target = dslScriptNodeProvider.getDeclaredNodeNameAtPosition(document, position)
            || dslScriptNodeProvider.getJumpTargetAtPosition(document, position);
        if (!target) {
            return undefined;
        }

        const references = await dslScriptNodeProvider.collectWorkspaceJumpReferences(document, target);
        let locations = references.map((reference) => createLocation(reference));

        if (context && context.includeDeclaration) {
            const declarations = await dslScriptNodeProvider.collectWorkspaceNodes(document);
            locations = declarations.filter((node) => node.name === target)
                .map((node) => createLocation(node))
                .concat(locations);
        }

        locations = uniqueLocations(locations);
        return locations.length > 0 ? locations : undefined;
    }
}

class DslScriptHoverProvider {

    async provideHover(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const speakerInfo = dslScriptSpeakerProvider.getSpeakerAtPosition(document, position);
        if (speakerInfo) {
            const speakers = await dslScriptSpeakerProvider.collectWorkspaceSpeakers(document);
            const speaker = speakers.find((candidate) => candidate.name === speakerInfo.name);
            if (speaker) {
                return new vscode.Hover(dslScriptSpeakerProvider.createHoverMarkdown(speaker), speakerInfo.range);
            }
        }

        const hostBindingInfo = hostBindingProvider.getBindingAtPosition(document, position);
        if (hostBindingInfo) {
            const bindings = await hostBindingProvider.collectWorkspaceBindings(document, hostBindingInfo.kind);
            const binding = bindings.find((candidate) => candidate.alias === hostBindingInfo.alias);
            if (binding) {
                return new vscode.Hover(hostBindingProvider.createHoverMarkdown(binding), hostBindingInfo.range);
            }

            return new vscode.Hover(hostBindingProvider.createMissingHoverMarkdown({
                kind: hostBindingInfo.kind,
                alias: hostBindingInfo.alias,
                sourcePath: document.uri.fsPath
            }), hostBindingInfo.range);
        }

        const metadataInfo = dslScriptMetadataProvider.getDirectiveAtPosition(document, position);
        if (metadataInfo) {
            return new vscode.Hover(dslScriptMetadataProvider.createHoverMarkdown(metadataInfo), metadataInfo.range);
        }

        const declaredNode = dslScriptNodeProvider.getDeclaredNodeAtPosition(document, position);
        if (declaredNode) {
            return new vscode.Hover(dslScriptNodeProvider.createDeclarationHoverMarkdown(declaredNode.name), declaredNode.range);
        }

        const jumpTarget = dslScriptNodeProvider.getJumpTargetInfoAtPosition(document, position);
        if (jumpTarget) {
            return new vscode.Hover(dslScriptNodeProvider.createJumpTargetHoverMarkdown(jumpTarget.name), jumpTarget.range);
        }

        return undefined;
    }
}

class DslScriptDocumentSymbolProvider {

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

class DslScriptCodeLensProvider {

    async provideCodeLenses(document) {
        if (!isInscapeDocument(document)) {
            return [];
        }

        const currentDocumentNodes = dslScriptNodeProvider.collectDocumentNodes(document);
        if (currentDocumentNodes.length === 0) {
            return [];
        }

        const navigation = await dslScriptNodeProvider.collectWorkspaceNavigation(document);
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

function handleStyleSupportDocumentSave(context, document) {
    if (!document || document.uri.scheme !== "file") {
        return;
    }

    const fileName = path.basename(document.uri.fsPath).toLowerCase();
    if (!editorStyleFileNames.has(fileName)) {
        return;
    }

    refreshEditorStylesForVisibleEditors(context);
    refreshVisiblePreviewPanels(context);
}

function refreshVisiblePreviewPanels(context) {
    const seen = new Set();
    for (const editor of vscode.window.visibleTextEditors) {
        if (!isInscapeDocument(editor.document)) {
            continue;
        }

        const key = normalizePath(editor.document.uri.fsPath);
        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        refreshPreviewPanelsForDocument(context, editor.document);
    }
}

function refreshEditorStylesForVisibleEditors(context) {
    for (const editor of vscode.window.visibleTextEditors) {
        applyEditorStyleSheet(context, editor);
    }
}

function refreshEditorStylesForDocument(context, document) {
    if (!document || document.uri.scheme !== "file") {
        return;
    }

    for (const editor of vscode.window.visibleTextEditors) {
        if (normalizePath(editor.document.uri.fsPath) === normalizePath(document.uri.fsPath)) {
            applyEditorStyleSheet(context, editor);
        }
    }
}

async function applyEditorStyleSheet(context, editor) {
    clearEditorStyleState(editor);

    if (!editor || !isInscapeDocument(editor.document)) {
        return;
    }

    const style = await readEditorStyleSheet(editor.document);
    const ranges = collectEditorStyleRanges(editor.document);
    const entries = createEditorStyleEntries(style);
    const key = getEditorStyleStateKey(editor);
    editorStyleStates.set(key, entries);

    for (const entry of entries) {
        editor.setDecorations(entry.decoration, ranges[entry.key] || []);
    }
}

function getEditorStyleStateKey(editor) {
    return editor.document.uri.toString() + "::" + String(editor.viewColumn || 0);
}

function clearEditorStyleState(editor) {
    const key = getEditorStyleStateKey(editor);
    const existing = editorStyleStates.get(key);
    if (!existing) {
        return;
    }

    editorStyleStates.delete(key);
    for (const entry of existing) {
        entry.decoration.dispose();
    }
}

async function readEditorStyleSheet(document) {
    const projectConfig = await readProjectConfig(document);
    const configuredPath = projectConfig && projectConfig.config && projectConfig.config.styles
        ? projectConfig.config.styles.editor
        : undefined;

    if (!projectConfig || !projectConfig.configPath || !configuredPath) {
        return Object.assign({}, defaultEditorStyle);
    }

    const stylePath = resolveProjectConfigPath(projectConfig.configPath, configuredPath);
    try {
        const text = await fs.promises.readFile(stylePath, "utf8");
        return normalizeEditorStyleSheet(JSON.parse(text));
    } catch {
        return Object.assign({}, defaultEditorStyle);
    }
}

function normalizeEditorStyleSheet(value) {
    const style = Object.assign({}, defaultEditorStyle);
    if (!value || typeof value !== "object") {
        return style;
    }

    for (const key of Object.keys(defaultEditorStyle)) {
        if (typeof value[key] === "string" && value[key].trim()) {
            style[key] = value[key].trim();
        }
    }

    return style;
}

function createEditorStyleEntries(style) {
    return [
        createEditorStyleEntry("nodeName", { color: style.nodeNameColor }),
        createEditorStyleEntry("jumpTarget", { color: style.jumpTargetColor }),
        createEditorStyleEntry("metadata", { color: style.metadataColor }),
        createEditorStyleEntry("inlineTag", { color: style.inlineTagColor })
    ];
}

function buildEditorDecorationOptions(options) {
    const result = {};
    for (const [key, value] of Object.entries(options)) {
        if (typeof value === "string" && value.trim()) {
            result[key] = value.trim();
        }
    }
    return result;
}

function createEditorStyleEntry(key, options) {
    return {
        key,
        decoration: vscode.window.createTextEditorDecorationType(options)
    };
}

function collectEditorStyleRanges(document) {
    const ranges = {
        nodeName: [],
        speaker: [],
        dialogue: [],
        narration: [],
        choicePrompt: [],
        choiceText: [],
        jumpTarget: [],
        metadata: [],
        inlineTag: []
    };

    for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
        const text = document.lineAt(lineNumber).text;
        if (!text || !text.trim() || /^\s*\/\//.test(text)) {
            continue;
        }

        let match = /^(\s*)(::)(\s*)([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/.exec(text);
        if (match) {
            pushEditorStyleRange(ranges.nodeName, lineNumber, match.index + match[1].length + match[2].length + match[3].length, match[4].length);
            continue;
        }

        match = /^(\s*)(@)([A-Za-z_][A-Za-z0-9_.-]*)(?:((?::|\s+).*))?$/.exec(text);
        if (match) {
            pushTrimmedRange(ranges.metadata, lineNumber, text, 0, text.length);
            continue;
        }

        if (/^\s*\[[^\]\r\n]*\]\s*$/.test(text)) {
            pushTrimmedRange(ranges.inlineTag, lineNumber, text, 0, text.length);
            continue;
        }

        match = /^(\s*)(->)(\s*)([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/.exec(text);
        if (match) {
            pushEditorStyleRange(ranges.jumpTarget, lineNumber, match.index + match[1].length + match[2].length + match[3].length, match[4].length);
            continue;
        }

        match = /^(\s*\?\s*)(.*)$/.exec(text);
        if (match) {
            pushTrimmedRange(ranges.choicePrompt, lineNumber, text, match[1].length, text.length);
            continue;
        }

        match = /^(\s*-\s*)(.*?)(\s+->\s*[A-Za-z0-9_.-]+)?\s*$/.exec(text);
        if (match) {
            pushTrimmedRange(ranges.choiceText, lineNumber, text, match[1].length, match[1].length + match[2].length);
            const targetIndex = text.indexOf("->", match[1].length);
            if (targetIndex >= 0) {
                pushTrimmedRange(ranges.jumpTarget, lineNumber, text, targetIndex + 2, text.length);
            }
            continue;
        }

        const dialogueSeparator = findDialogueSeparatorIndex(text);
        if (dialogueSeparator >= 0) {
            const speakerRange = trimRange(text, 0, dialogueSeparator);
            const dialogueRange = trimRange(text, dialogueSeparator + 1, text.length);
            if (speakerRange && isLikelyDialogueSpeaker(text.slice(speakerRange.start, speakerRange.end))) {
                ranges.speaker.push(new vscode.Range(lineNumber, speakerRange.start, lineNumber, speakerRange.end));
                if (dialogueRange) {
                    ranges.dialogue.push(new vscode.Range(lineNumber, dialogueRange.start, lineNumber, dialogueRange.end));
                }
                continue;
            }
        }

        pushTrimmedRange(ranges.narration, lineNumber, text, 0, text.length);
    }

    return ranges;
}

function pushEditorStyleRange(bucket, lineNumber, start, length) {
    if (length <= 0) {
        return;
    }

    bucket.push(new vscode.Range(lineNumber, start, lineNumber, start + length));
}

function pushTrimmedRange(bucket, lineNumber, text, start, end) {
    const range = trimRange(text, start, end);
    if (!range) {
        return;
    }

    bucket.push(new vscode.Range(lineNumber, range.start, lineNumber, range.end));
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

function schedulePreviewRefresh(context, document, delayOverride) {
    if (!isInscapeDocument(document)) {
        return;
    }

            action: () => previewCommand.revealSelection(context)
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

class PreviewEditorProvider {

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

            openPreviewSource(message.source, webviewPanel);
        });

        refreshPreviewPanel(this.context, webviewPanel, document, true)
            .then(() => previewRevealBridge.applyPending(webviewPanel, document));
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

async function openPreviewSource(source, webviewPanel) {
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

        const existingEditor = findVisibleTextEditorForUri(location.uri, webviewPanel);
        if (existingEditor) {
            await focusExistingTextEditor(existingEditor, location.range);
            return;
        }

        await openLocation(location, {
            viewColumn: resolveSourceViewColumn(location.uri, webviewPanel)
        });
    } catch (error) {
        vscode.window.showErrorMessage(error.message || String(error));
    }
}

const previewRevealBridge = new PreviewRevealBridge({
    vscode,
    previewPanels,
    refreshPreviewPanel,
    isInscapeDocument,
    normalizePath,
    isLikelyDialogueSpeaker,
    findDialogueSeparatorIndex,
    trimRange
});

previewCommand = new PreviewCommand({
    vscode,
    selectWorkspaceFolder,
    isInscapeDocument,
    previewRevealBridge,
    normalizePath
});

localizationCommand = new LocalizationCommand({
    vscode,
    childProcess,
    fs,
    path,
    selectWorkspaceFolder,
    isInscapeDocument,
    writeTempDocument,
    resolveCliProjectPath,
    normalizePath
});

editorAuthoringCommand = new EditorAuthoringCommand({
    vscode,
    fs,
    path,
    previewCommand,
    selectWorkspaceFolder,
    defaultEditorStyle,
    defaultPreviewStyle
});

hostSchemaCommand = new HostSchemaCommand({
    vscode,
    fs,
    selectWorkspaceFolder,
    readProjectConfigFromWorkspaceFolder,
    resolveProjectConfigPath,
    openLocation,
    locationFromPayload,
    escapeRegExp
});

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
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

function resolveCliProjectPath(context, workspaceFolderPath) {
    const candidates = [
        path.join(workspaceFolderPath, "src", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj"),
        path.resolve(context.extensionPath, "..", "..", "Cli", "Inscape.Cli", "Inscape.Cli.csproj")
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
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

function normalizeHostBindingKind(kind) {
    if (kind === "timeline" || /^timeline\.(?:talking|node)\.(?:enter|exit)$/.test(kind)) {
        return "timeline";
    }

    return kind;
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

function findDialogueSeparatorIndex(line) {
    const halfWidth = line.indexOf(":");
    const fullWidth = line.indexOf("\uFF1A");
    if (halfWidth < 0) {
        return fullWidth;
    }

    if (fullWidth < 0) {
        return halfWidth;
    }

    return Math.min(halfWidth, fullWidth);
}

function trimRange(line, start, end) {
    let rangeStart = Math.max(0, start);
    let rangeEnd = Math.max(rangeStart, end);

    while (rangeStart < rangeEnd && /\s/.test(line[rangeStart])) {
        rangeStart += 1;
    }

    while (rangeEnd > rangeStart && /\s/.test(line[rangeEnd - 1])) {
        rangeEnd -= 1;
    }

    if (rangeEnd <= rangeStart) {
        return undefined;
    }

    return { start: rangeStart, end: rangeEnd };
}

function isJumpReferenceLine(line) {
    const trimmed = line.trim();
    return trimmed.startsWith("->") || trimmed.startsWith("-");
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

async function openLocation(location, options = {}) {
    const document = await vscode.workspace.openTextDocument(location.uri);
    const editor = await vscode.window.showTextDocument(document, {
        viewColumn: options.viewColumn,
        preview: false,
        preserveFocus: false,
        selection: location.range
    });
    editor.selection = new vscode.Selection(location.range.start, location.range.end);
    editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);
}

async function focusExistingTextEditor(editor, range) {
    const activatedEditor = await vscode.window.showTextDocument(editor.document, {
        viewColumn: editor.viewColumn,
        preview: false,
        preserveFocus: false,
        selection: range
    });
    activatedEditor.selection = new vscode.Selection(range.start, range.end);
    activatedEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

function findVisibleTextEditorForUri(targetUri, webviewPanel) {
    const targetPath = normalizePath(targetUri.fsPath);
    const exactMatch = vscode.window.visibleTextEditors.find((editor) => normalizePath(editor.document.uri.fsPath) === targetPath);
    if (exactMatch) {
        return exactMatch;
    }

    if (!webviewPanel) {
        return undefined;
    }

    return vscode.window.visibleTextEditors.find((editor) => editor.viewColumn && editor.viewColumn !== webviewPanel.viewColumn);
}

function resolveSourceViewColumn(targetUri, webviewPanel) {
    const visibleEditor = vscode.window.visibleTextEditors.find((editor) => normalizePath(editor.document.uri.fsPath) === normalizePath(targetUri.fsPath));
    if (visibleEditor && visibleEditor.viewColumn) {
        return visibleEditor.viewColumn;
    }

    const openTabColumn = findOpenTextTabViewColumn(targetUri);
    if (openTabColumn) {
        return openTabColumn;
    }

    const fallbackEditor = vscode.window.visibleTextEditors.find((editor) => editor.viewColumn && (!webviewPanel || editor.viewColumn !== webviewPanel.viewColumn));
    if (fallbackEditor && fallbackEditor.viewColumn) {
        return fallbackEditor.viewColumn;
    }

    if (webviewPanel && typeof webviewPanel.viewColumn === "number") {
        return webviewPanel.viewColumn > 1 ? webviewPanel.viewColumn - 1 : vscode.ViewColumn.Beside;
    }

    return vscode.ViewColumn.Beside;
}

function findOpenTextTabViewColumn(targetUri) {
    const targetPath = normalizePath(targetUri.fsPath);
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            if (!input || !input.uri || input.viewType === "inscape.preview") {
                continue;
            }

            if (normalizePath(input.uri.fsPath) === targetPath && group.viewColumn) {
                return group.viewColumn;
            }
        }
    }

    return undefined;
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
