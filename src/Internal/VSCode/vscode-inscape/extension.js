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
const { ExtensionLifecycleController } = require("./ExtensionEntry/ExtensionLifecycleController");
const { ExtensionRegistrationController } = require("./ExtensionEntry/ExtensionRegistrationController");
const { DslScriptCodeLensProvider } = require("./LanguageFeatures/DslScriptCodeLensProvider");
const { DslScriptCompletionProvider } = require("./LanguageFeatures/DslScriptCompletionProvider");
const { DslScriptDiagnosticController } = require("./LanguageFeatures/DslScriptDiagnosticController");
const { DslScriptDefinitionProvider } = require("./LanguageFeatures/DslScriptDefinitionProvider");
const { DslScriptDocumentSymbolProvider } = require("./LanguageFeatures/DslScriptDocumentSymbolProvider");
const { DslScriptHoverProvider } = require("./LanguageFeatures/DslScriptHoverProvider");
const { DslScriptReferenceProvider } = require("./LanguageFeatures/DslScriptReferenceProvider");
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
const { EditorAuthoringDataProvider } = require("./WorkspaceIndex/EditorAuthoringDataProvider");

const languageSelector = { language: "inscape" };
const previewPanels = new Map();

let previewCommand;
let localizationCommand;
let editorAuthoringCommand;
let hostSchemaCommand;
let editorAuthoringDataProvider;
let dslScriptDiagnosticController;
let extensionLifecycleController;
let extensionRegistrationController;

editorAuthoringDataProvider = new EditorAuthoringDataProvider({
    fs,
    path,
    vscode,
    isInscapeDocument,
    normalizePath
});

const dslScriptNodeProvider = new DslScriptNodeProvider({
    vscode,
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document),
    isJumpReferenceLine
});

const dslScriptSpeakerProvider = new DslScriptSpeakerProvider({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    parseCsvRows: (text) => editorAuthoringDataProvider.parseCsvRows(text),
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document),
    isLikelyDialogueSpeaker,
    formatDisplayPath
});

const hostBindingProvider = new HostBindingProvider({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    parseCsvRows: (text) => editorAuthoringDataProvider.parseCsvRows(text),
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document),
    normalizeHostBindingKind,
    formatDisplayPath
});

const dslScriptMetadataProvider = new DslScriptMetadataProvider({
    vscode,
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document)
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

dslScriptDiagnosticController = new DslScriptDiagnosticController({
    fs,
    os,
    path,
    vscode,
    isInscapeDocument,
    normalizePath,
    clamp
});

extensionLifecycleController = new ExtensionLifecycleController({
    childProcess,
    fs,
    vscode,
    isInscapeDocument,
    diagnosticController: dslScriptDiagnosticController
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
    logOutput: (message) => extensionLifecycleController.logOutput(message)
});

const previewSourceController = new PreviewSourceController({
    vscode,
    normalizePath,
    openLocation
});

const editorStyleController = new EditorStyleController({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    isInscapeDocument,
    isLikelyDialogueSpeaker,
    findDialogueSeparatorIndex,
    trimRange
});

function activate(context) {
    extensionLifecycleController.activate(context, extensionRegistrationController);
}

function deactivate() {
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
    readProjectConfigFromWorkspaceFolder: (folder) => editorAuthoringDataProvider.readProjectConfigFromWorkspaceFolder(folder),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    openLocation,
    locationFromPayload,
    escapeRegExp
});

extensionRegistrationController = new ExtensionRegistrationController({
    vscode,
    path,
    languageSelector,
    previewPanels,
    normalizePath,
    previewHtmlProvider,
    refreshPreviewPanel,
    previewRevealBridge,
    previewSourceController,
    refreshPreviewPanelsForDocument,
    schedulePreviewRefresh,
    refreshVisiblePreviewPanels,
    refreshVisibleDocuments,
    editorStyleController,
    dslScriptCompletionProvider,
    dslScriptDocumentSymbolProvider,
    dslScriptDefinitionProvider,
    dslScriptReferenceProvider,
    dslScriptHoverProvider,
    dslScriptCodeLensProvider,
    showNodeIncomingReferences,
    previewCommand,
    editorAuthoringCommand,
    localizationCommand,
    hostSchemaCommand
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
