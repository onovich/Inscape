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
const { DslScriptCodeLensProvider } = require("./LanguageFeatures/DslScriptCodeLensProvider");
const { DslScriptCompletionProvider } = require("./LanguageFeatures/DslScriptCompletionProvider");
const { DslScriptDefinitionProvider } = require("./LanguageFeatures/DslScriptDefinitionProvider");
const { DslScriptDiagnosticScheduler } = require("./LanguageFeatures/DslScriptDiagnosticScheduler");
const { DslScriptDocumentSymbolProvider } = require("./LanguageFeatures/DslScriptDocumentSymbolProvider");
const { DslScriptHoverProvider } = require("./LanguageFeatures/DslScriptHoverProvider");
const { DslScriptReferenceProvider } = require("./LanguageFeatures/DslScriptReferenceProvider");
const { PreviewEditorProvider } = require("./PreviewWebview/PreviewEditorProvider");
const { PreviewHtmlProvider } = require("./PreviewWebview/PreviewHtmlProvider");
const { PreviewInvocationProvider } = require("./PreviewWebview/PreviewInvocationProvider");
const { PreviewRefreshController } = require("./PreviewWebview/PreviewRefreshController");
const { PreviewSourceController } = require("./PreviewWebview/PreviewSourceController");
const { EditorStyleController } = require("./Styles/EditorStyleController");
const { defaultEditorStyle, defaultPreviewStyle } = require("./Styles/StyleDefaults");
const { HostBindingProvider } = require("./WorkspaceIndex/HostBindingProvider");
const { DslScriptMetadataProvider } = require("./WorkspaceIndex/DslScriptMetadataProvider");
const { DslScriptNodeProvider } = require("./WorkspaceIndex/DslScriptNodeProvider");
const { DslScriptSpeakerProvider } = require("./WorkspaceIndex/DslScriptSpeakerProvider");

const languageSelector = { language: "inscape" };
let outputChannel;
const previewPanels = new Map();

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

const dslScriptCompletionProvider = new DslScriptCompletionProvider({
    vscode,
    isInscapeDocument,
    isJumpTargetContext,
    isSpeakerCompletionContext,
    dslScriptNodeProvider,
    dslScriptSpeakerProvider,
    hostBindingProvider
});

const dslScriptReferenceProvider = new DslScriptReferenceProvider({
    isInscapeDocument,
    createLocation,
    uniqueLocations,
    dslScriptNodeProvider,
    dslScriptSpeakerProvider
});

const dslScriptHoverProvider = new DslScriptHoverProvider({
    vscode,
    isInscapeDocument,
    dslScriptNodeProvider,
    dslScriptSpeakerProvider,
    hostBindingProvider,
    dslScriptMetadataProvider
});

const dslScriptDocumentSymbolProvider = new DslScriptDocumentSymbolProvider({
    vscode
});

const dslScriptCodeLensProvider = new DslScriptCodeLensProvider({
    vscode,
    isInscapeDocument,
    createLocation,
    dslScriptNodeProvider
});

const previewHtmlProvider = new PreviewHtmlProvider();

const previewInvocationProvider = new PreviewInvocationProvider({
    fs,
    path,
    vscode,
    getWorkspaceFolder,
    resolveCliProjectPath
});

const previewRefreshController = new PreviewRefreshController({
    fs,
    vscode,
    previewPanels,
    previewHtmlProvider,
    isInscapeDocument,
    normalizePath,
    hashDocumentText,
    writeTempDocument,
    createTempPath,
    previewInvocationProvider,
    execFileDetailedPromise,
    getInvocationFailureDetail,
    logOutput
});

const previewSourceController = new PreviewSourceController({
    vscode,
    normalizePath,
    openLocation
});

const editorStyleController = new EditorStyleController({
    vscode,
    fs,
    readProjectConfig,
    resolveProjectConfigPath,
    isInscapeDocument,
    isLikelyDialogueSpeaker,
    findDialogueSeparatorIndex,
    trimRange
});

function activate(context) {
    outputChannel = vscode.window.createOutputChannel("Inscape");
    const diagnostics = vscode.languages.createDiagnosticCollection("inscape");
    const scheduler = new DslScriptDiagnosticScheduler({
        childProcess,
        fs,
        vscode,
        context,
        diagnostics,
        isInscapeDocument,
        writeTempDocument,
        createCompilerInvocation,
        createExtensionDiagnostic,
        applyDiagnostics
    });
    logOutput("Activated Inscape extension from " + context.extensionPath);

    context.subscriptions.push(
        outputChannel,
        diagnostics,
        scheduler,
        vscode.workspace.onDidOpenTextDocument((document) => scheduler.schedule(document)),
        vscode.workspace.onDidChangeTextDocument((event) => {
            scheduler.schedule(event.document);
            schedulePreviewRefresh(context, event.document, 250);
            editorStyleController.refreshDocument(context, event.document);
        }),
        vscode.workspace.onDidSaveTextDocument((document) => {
            scheduler.schedule(document, 0);
            refreshPreviewPanelsForDocument(context, document);
            editorStyleController.refreshDocument(context, document);
            editorStyleController.handleSupportDocumentSave(context, document, refreshVisiblePreviewPanels);
        }),
        vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
        vscode.window.onDidChangeTextEditorSelection((event) => previewRevealBridge.handleSelectionChange(context, event)),
        vscode.window.onDidChangeVisibleTextEditors(() => editorStyleController.refreshVisibleEditors(context)),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("inscape")) {
                refreshVisibleDocuments(scheduler);
                editorStyleController.refreshVisibleEditors(context);
            }
        }),
        vscode.languages.registerCompletionItemProvider(languageSelector, dslScriptCompletionProvider, ">", ".", ":", "\uFF1A", "[", " "),
        vscode.languages.registerDocumentSymbolProvider(languageSelector, dslScriptDocumentSymbolProvider),
        vscode.languages.registerDefinitionProvider(languageSelector, dslScriptDefinitionProvider),
        vscode.languages.registerReferenceProvider(languageSelector, dslScriptReferenceProvider),
        vscode.languages.registerHoverProvider(languageSelector, dslScriptHoverProvider),
        vscode.languages.registerCodeLensProvider(languageSelector, dslScriptCodeLensProvider),
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
            new PreviewEditorProvider({
                path,
                context,
                previewPanels,
                normalizePath,
                createPreviewLoadingHtml: (workspaceName) => previewHtmlProvider.createLoadingHtml(workspaceName),
                refreshPreviewPanel,
                previewRevealBridge,
                openPreviewSource: (source, webviewPanel) => previewSourceController.openSource(source, webviewPanel)
            }),
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                },
                supportsMultipleEditorsPerDocument: true
            }
        )
    );

    refreshVisibleDocuments(scheduler);
    editorStyleController.refreshVisibleEditors(context);
}

function deactivate() {
}

function logOutput(message) {
    if (!outputChannel) {
        return;
    }

    outputChannel.appendLine("[" + new Date().toISOString() + "] " + message);
}

function refreshVisibleDocuments(scheduler) {
    for (const editor of vscode.window.visibleTextEditors) {
        scheduler.schedule(editor.document, 0);
    }
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

async function refreshPreviewPanelsForDocument(context, document) {
    await previewRefreshController.refreshPanelsForDocument(context, document);
}

function schedulePreviewRefresh(context, document, delayOverride) {
    previewRefreshController.scheduleRefresh(context, document, delayOverride);
}

async function refreshPreviewPanel(context, panel, document, showProgress) {
    await previewRefreshController.refreshPanel(context, panel, document, showProgress);
}

function hashDocumentText(document) {
    return crypto.createHash("sha1").update(document.getText(), "utf8").digest("hex");
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

const dslScriptDefinitionProvider = new DslScriptDefinitionProvider({
    vscode,
    isInscapeDocument,
    createLocation,
    uniqueLocations,
    dslScriptNodeProvider,
    dslScriptSpeakerProvider,
    hostBindingProvider,
    dslScriptMetadataProvider,
    previewRevealBridge
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
