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
const { EditorAuthoringLocationProvider } = require("./LanguageFeatures/EditorAuthoringLocationProvider");
const { DslScriptHoverProvider } = require("./LanguageFeatures/DslScriptHoverProvider");
const { DslScriptReferenceProvider } = require("./LanguageFeatures/DslScriptReferenceProvider");
const { PreviewHtmlProvider } = require("./PreviewWebview/PreviewHtmlProvider");
const { PreviewInvocationProvider } = require("./PreviewWebview/PreviewInvocationProvider");
const { PreviewRefreshController } = require("./PreviewWebview/PreviewRefreshController");
const { PreviewSourceController } = require("./PreviewWebview/PreviewSourceController");
const { EditorStyleController } = require("./Styles/EditorStyleController");
const { defaultEditorStyle, defaultPreviewStyle } = require("./Styles/StyleDefaults");
const { HostBindingProvider } = require("./WorkspaceIndex/HostBindingProvider");
const { HostSchemaCapabilityProvider } = require("./WorkspaceIndex/HostSchemaCapabilityProvider");
const { DslScriptHostEventProvider } = require("./WorkspaceIndex/DslScriptHostEventProvider");
const { DslScriptMetadataProvider } = require("./WorkspaceIndex/DslScriptMetadataProvider");
const { DslScriptNodeProvider } = require("./WorkspaceIndex/DslScriptNodeProvider");
const { DslScriptQueryInterpolationProvider } = require("./WorkspaceIndex/DslScriptQueryInterpolationProvider");
const { DslScriptSpeakerProvider } = require("./WorkspaceIndex/DslScriptSpeakerProvider");
const { EditorAuthoringDataProvider } = require("./WorkspaceIndex/EditorAuthoringDataProvider");

const languageSelector = { language: "inscape" };
const previewPanels = new Map();

let previewCommand;
let localizationCommand;
let editorAuthoringCommand;
let hostSchemaCommand;
let editorAuthoringDataProvider;
let editorAuthoringLocationProvider;
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

editorAuthoringLocationProvider = new EditorAuthoringLocationProvider({
    path,
    vscode,
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
    formatDisplayPath: (sourcePath) => editorAuthoringLocationProvider.formatDisplayPath(sourcePath)
});

const hostBindingProvider = new HostBindingProvider({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    parseCsvRows: (text) => editorAuthoringDataProvider.parseCsvRows(text),
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document),
    normalizeHostBindingKind,
    formatDisplayPath: (sourcePath) => editorAuthoringLocationProvider.formatDisplayPath(sourcePath)
});

const hostSchemaCapabilityProvider = new HostSchemaCapabilityProvider({
    childProcess,
    fs,
    path,
    vscode,
    resolveCliProjectPath: (workspaceFolderPath) => resolveCliProjectPathFromBase(workspaceFolderPath, __dirname)
});

const dslScriptMetadataProvider = new DslScriptMetadataProvider({
    vscode,
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document)
});

const dslScriptQueryInterpolationProvider = new DslScriptQueryInterpolationProvider({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    formatDisplayPath: (sourcePath) => editorAuthoringLocationProvider.formatDisplayPath(sourcePath),
    hostSchemaCapabilityProvider
});

const dslScriptHostEventProvider = new DslScriptHostEventProvider({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    formatDisplayPath: (sourcePath) => editorAuthoringLocationProvider.formatDisplayPath(sourcePath),
    hostSchemaCapabilityProvider
});

const dslScriptCompletionProvider = new DslScriptCompletionProvider({
    childProcess,
    fs,
    os,
    path,
    vscode,
    isInscapeDocument,
    isJumpTargetContext,
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
    isSpeakerCompletionContext,
    dslScriptSpeakerProvider,
    hostBindingProvider,
    dslScriptQueryInterpolationProvider,
    dslScriptHostEventProvider
});

const dslScriptReferenceProvider = new DslScriptReferenceProvider({
    childProcess,
    fs,
    os,
    path,
    vscode,
    isInscapeDocument,
    createLocation: (item) => editorAuthoringLocationProvider.createLocation(item),
    uniqueLocations: (locations) => editorAuthoringLocationProvider.uniqueLocations(locations),
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
    dslScriptNodeProvider,
    dslScriptSpeakerProvider
});

const dslScriptHoverProvider = new DslScriptHoverProvider({
    childProcess,
    fs,
    os,
    path,
    vscode,
    isInscapeDocument,
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
    dslScriptNodeProvider,
    dslScriptSpeakerProvider,
    hostBindingProvider,
    dslScriptMetadataProvider,
    dslScriptQueryInterpolationProvider,
    dslScriptHostEventProvider
});

const dslScriptDocumentSymbolProvider = new DslScriptDocumentSymbolProvider({
    childProcess,
    fs,
    os,
    path,
    vscode,
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname)
});

const dslScriptCodeLensProvider = new DslScriptCodeLensProvider({
    vscode,
    isInscapeDocument,
    createLocation: (item) => editorAuthoringLocationProvider.createLocation(item),
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
    clamp: (value, minimum, maximum) => editorAuthoringLocationProvider.clamp(value, minimum, maximum),
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname)
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
    openLocation: (location, options) => editorAuthoringLocationProvider.openLocation(location, options)
});

const editorStyleController = new EditorStyleController({
    vscode,
    fs,
    readProjectConfig: (document) => editorAuthoringDataProvider.readProjectConfig(document),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    isInscapeDocument,
    isLikelyDialogueSpeaker,
    findDialogueSeparatorIndex: (line) => editorAuthoringLocationProvider.findDialogueSeparatorIndex(line),
    trimRange: (line, start, end) => editorAuthoringLocationProvider.trimRange(line, start, end)
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
    findDialogueSeparatorIndex: (line) => editorAuthoringLocationProvider.findDialogueSeparatorIndex(line),
    trimRange: (line, start, end) => editorAuthoringLocationProvider.trimRange(line, start, end)
});

const dslScriptDefinitionProvider = new DslScriptDefinitionProvider({
    childProcess,
    fs,
    os,
    path,
    vscode,
    isInscapeDocument,
    createLocation: (item) => editorAuthoringLocationProvider.createLocation(item),
    uniqueLocations: (locations) => editorAuthoringLocationProvider.uniqueLocations(locations),
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
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
    isInscapeDocument,
    previewCommand,
    selectWorkspaceFolder,
    dslScriptNodeProvider,
    defaultEditorStyle,
    defaultPreviewStyle
});

hostSchemaCommand = new HostSchemaCommand({
    vscode,
    fs,
    selectWorkspaceFolder,
    readProjectConfigFromWorkspaceFolder: (folder) => editorAuthoringDataProvider.readProjectConfigFromWorkspaceFolder(folder),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    openLocation: (location, options) => editorAuthoringLocationProvider.openLocation(location, options),
    locationFromPayload: (payload) => editorAuthoringLocationProvider.locationFromPayload(payload),
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
    return resolveCliProjectPathFromBase(workspaceFolderPath, context.extensionPath);
}

function resolveLanguageServerProjectPathFromBase(workspaceFolderPath, extensionBasePath) {
    const candidates = [
        path.join(workspaceFolderPath, "src", "Internal", "LanguageServer", "Inscape.LanguageServer.csproj"),
        path.resolve(extensionBasePath, "..", "..", "Internal", "LanguageServer", "Inscape.LanguageServer.csproj")
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return candidates[0];
}

function resolveCliProjectPathFromBase(workspaceFolderPath, extensionBasePath) {
    const candidates = [
        path.join(workspaceFolderPath, "src", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj"),
        path.resolve(extensionBasePath, "..", "..", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj")
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
    return /(?:^|\s)->\s*[^/\\\r\n]*$/.test(linePrefix);
}

function isSpeakerCompletionContext(linePrefix) {
    const trimmed = linePrefix.trimStart();
    if (!trimmed) {
        return true;
    }

    if (trimmed.startsWith("@")
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
        && !name.startsWith("@")
        && !name.startsWith("//")
        && !name.startsWith("->")
        && !name.startsWith("?")
        && !name.startsWith("-")
        && !name.startsWith("[");
}

function isJumpReferenceLine(line) {
    const trimmed = line.trim();
    return trimmed.startsWith("->") || trimmed.startsWith("-");
}

function normalizePath(value) {
    return path.resolve(value).toLowerCase();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
    activate,
    deactivate
};
