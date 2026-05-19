"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const crypto = require("crypto");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const { EditorAuthoringCommand } = require("./EditorAuthoring/Commands/EditorAuthoringCommand");
const { StoryNodeMapReviewController } = require("./EditorAuthoring/Controllers/StoryNodeMapReviewController");
const { EditorAuthoringStyleController } = require("./EditorAuthoring/Controllers/EditorAuthoringStyleController");
const { defaultEditorStyle } = require("./EditorAuthoring/Models/EditorAuthoringStyleDefaultsModel");
const { EditorAuthoringDataProvider } = require("./EditorAuthoring/Providers/EditorAuthoringDataProvider");
const { EditorAuthoringLocationProvider } = require("./EditorAuthoring/Providers/EditorAuthoringLocationProvider");
const { HostBindingProvider } = require("./HostBinding/Providers/HostBindingProvider");
const { HostSchemaCommand } = require("./HostSchema/Commands/HostSchemaCommand");
const { HostSchemaCapabilityProvider } = require("./HostSchema/Providers/HostSchemaCapabilityProvider");
const { LanguageServerSessionClient } = require("./LanguageServer/Clients/LanguageServerSessionClient");
const { LocalizationCommand } = require("./Localization/Commands/LocalizationCommand");
const { LocalizationReviewController } = require("./Localization/Controllers/LocalizationReviewController");
const { LocalizationReviewPresenterModelBuilder } = require("./Localization/ViewModels/LocalizationReviewPresenterModelBuilder");
const { LocalizationReviewQuickPickAdapter } = require("./Localization/ViewModels/LocalizationReviewQuickPickAdapter");
const { ExtensionLifecycleController } = require("./Entries/ExtensionLifecycleController");
const { ExtensionRegistrationController } = require("./Entries/ExtensionRegistrationController");
const { DslScriptDiagnosticController } = require("./DslScript/Controllers/DslScriptDiagnosticController");
const { DslScriptCodeLensProvider } = require("./DslScript/Providers/DslScriptCodeLensProvider");
const { DslScriptCompletionProvider } = require("./DslScript/Providers/DslScriptCompletionProvider");
const { DslScriptDefinitionProvider } = require("./DslScript/Providers/DslScriptDefinitionProvider");
const { DslScriptDocumentSymbolProvider } = require("./DslScript/Providers/DslScriptDocumentSymbolProvider");
const { DslScriptHostEventProvider } = require("./DslScript/Providers/DslScriptHostEventProvider");
const { DslScriptHoverProvider } = require("./DslScript/Providers/DslScriptHoverProvider");
const { DslScriptMetadataProvider } = require("./DslScript/Providers/DslScriptMetadataProvider");
const { DslScriptNodeProvider } = require("./DslScript/Providers/DslScriptNodeProvider");
const { DslScriptQueryInterpolationProvider } = require("./DslScript/Providers/DslScriptQueryInterpolationProvider");
const { DslScriptReferenceProvider } = require("./DslScript/Providers/DslScriptReferenceProvider");
const { DslScriptSpeakerProvider } = require("./DslScript/Providers/DslScriptSpeakerProvider");
const { PreviewRefreshController } = require("./Preview/Controllers/PreviewRefreshController");
const { PreviewSourceController } = require("./Preview/Controllers/PreviewSourceController");
const { PreviewRevealBridge } = require("./Preview/Bridges/PreviewRevealBridge");
const { PreviewCommand } = require("./Preview/Commands/PreviewCommand");
const { PreviewHtmlProvider } = require("./Preview/Providers/PreviewHtmlProvider");
const { PreviewInvocationProvider } = require("./Preview/Providers/PreviewInvocationProvider");
const { defaultPreviewStyle } = require("./Preview/Models/PreviewStyleDefaultsModel");

const languageSelector = { language: "inscape" };
const previewPanels = new Map();

let previewCommand;
let localizationCommand;
let localizationReviewController;
let localizationReviewPresenterModelBuilder;
let localizationReviewQuickPickAdapter;
let storyNodeMapReviewController;
let editorAuthoringCommand;
let hostSchemaCommand;
let editorAuthoringDataProvider;
let editorAuthoringLocationProvider;
let dslScriptDiagnosticController;
let languageServerSessionClient;
let extensionLifecycleController;
let extensionRegistrationController;

const locationServices = {
    openLocation: (location, options) => editorAuthoringLocationProvider.openLocation(location, options),
    locationFromPayload: (payload) => editorAuthoringLocationProvider.locationFromPayload(payload)
};

const openFileInEditor = async (filePath) => {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(document, {
        preview: false,
        preserveFocus: false
    });
};

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

languageServerSessionClient = new LanguageServerSessionClient({
    childProcess,
    fs,
    path,
    vscode,
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
    logOutput: (message) => extensionLifecycleController.logOutput(message)
});

const hostSchemaCapabilityProvider = new HostSchemaCapabilityProvider({
    childProcess,
    fs,
    path,
    vscode,
    languageServerSessionClient,
    resolveLanguageServerProjectPath: (workspaceFolderPath) => resolveLanguageServerProjectPathFromBase(workspaceFolderPath, __dirname),
    resolveCliProjectPath: (workspaceFolderPath) => resolveCliProjectPathFromBase(workspaceFolderPath, __dirname),
    logOutput: (message) => extensionLifecycleController.logOutput(message)
});

const dslScriptMetadataProvider = new DslScriptMetadataProvider({
    vscode,
    collectWorkspaceTextSources: (document) => editorAuthoringDataProvider.collectTextSources(document)
});

const dslScriptQueryInterpolationProvider = new DslScriptQueryInterpolationProvider({
    vscode,
    formatDisplayPath: (sourcePath) => editorAuthoringLocationProvider.formatDisplayPath(sourcePath),
    hostSchemaCapabilityProvider
});

const dslScriptHostEventProvider = new DslScriptHostEventProvider({
    vscode,
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
    languageServerSessionClient,
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
    languageServerSessionClient,
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
    languageServerSessionClient,
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
    languageServerSessionClient
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
    diagnosticController: dslScriptDiagnosticController,
    languageServerSessionClient
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
    openLocation: locationServices.openLocation
});

const editorStyleController = new EditorAuthoringStyleController({
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
    getSourceSyncMode,
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
    languageServerSessionClient,
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

localizationReviewPresenterModelBuilder = new LocalizationReviewPresenterModelBuilder({
    formatDisplayPath: (value) => path.basename(String(value || ""))
});

localizationReviewQuickPickAdapter = new LocalizationReviewQuickPickAdapter();

localizationReviewController = new LocalizationReviewController({
    vscode,
    fs,
    localizationReviewPresenterModelBuilder,
    localizationReviewQuickPickAdapter,
    ...locationServices
});

localizationCommand = new LocalizationCommand({
    vscode,
    childProcess,
    fs,
    path,
    localizationReviewController,
    selectWorkspaceFolder,
    isInscapeDocument,
    writeTempDocument,
    resolveCliProjectPath,
    normalizePath
});

storyNodeMapReviewController = new StoryNodeMapReviewController({
    vscode,
    fs,
    path,
    ...locationServices,
    openFile: openFileInEditor
});

editorAuthoringCommand = new EditorAuthoringCommand({
    vscode,
    childProcess,
    fs,
    path,
    isInscapeDocument,
    previewCommand,
    localizationCommand,
    storyNodeMapReviewController,
    selectWorkspaceFolder,
    dslScriptNodeProvider,
    defaultEditorStyle,
    defaultPreviewStyle,
    writeTempDocument,
    createTempPath,
    resolveCliProjectPath,
    normalizePath
});

hostSchemaCommand = new HostSchemaCommand({
    vscode,
    fs,
    selectWorkspaceFolder,
    readProjectConfigFromWorkspaceFolder: (folder) => editorAuthoringDataProvider.readProjectConfigFromWorkspaceFolder(folder),
    resolveProjectConfigPath: (configPath, value) => editorAuthoringDataProvider.resolveProjectConfigPath(configPath, value),
    ...locationServices,
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

function getSourceSyncMode(document) {
    const configuration = vscode.workspace.getConfiguration("inscape", document ? document.uri : undefined);
    return configuration.get("preview.sourceSyncMode", "click");
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
