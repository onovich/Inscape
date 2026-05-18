const { PreviewEditorProvider } = require("../Preview/Providers/PreviewEditorProvider");

class ExtensionRegistrationController {
    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.path = dependencies.path;
        this.languageSelector = dependencies.languageSelector;
        this.previewPanels = dependencies.previewPanels;
        this.normalizePath = dependencies.normalizePath;
        this.previewHtmlProvider = dependencies.previewHtmlProvider;
        this.refreshPreviewPanel = dependencies.refreshPreviewPanel;
        this.previewRevealBridge = dependencies.previewRevealBridge;
        this.previewSourceController = dependencies.previewSourceController;
        this.refreshPreviewPanelsForDocument = dependencies.refreshPreviewPanelsForDocument;
        this.schedulePreviewRefresh = dependencies.schedulePreviewRefresh;
        this.refreshVisiblePreviewPanels = dependencies.refreshVisiblePreviewPanels;
        this.refreshVisibleDocuments = dependencies.refreshVisibleDocuments;
        this.editorStyleController = dependencies.editorStyleController;
        this.dslScriptCompletionProvider = dependencies.dslScriptCompletionProvider;
        this.dslScriptDocumentSymbolProvider = dependencies.dslScriptDocumentSymbolProvider;
        this.dslScriptDefinitionProvider = dependencies.dslScriptDefinitionProvider;
        this.dslScriptReferenceProvider = dependencies.dslScriptReferenceProvider;
        this.dslScriptHoverProvider = dependencies.dslScriptHoverProvider;
        this.dslScriptCodeLensProvider = dependencies.dslScriptCodeLensProvider;
        this.showNodeIncomingReferences = dependencies.showNodeIncomingReferences;
        this.previewCommand = dependencies.previewCommand;
        this.editorAuthoringCommand = dependencies.editorAuthoringCommand;
        this.localizationCommand = dependencies.localizationCommand;
        this.hostSchemaCommand = dependencies.hostSchemaCommand;
    }

    register(context, registrations) {
        const scheduler = registrations.scheduler;
        const diagnostics = registrations.diagnostics;

        context.subscriptions.push(
            registrations.outputChannel,
            diagnostics,
            scheduler,
            this.vscode.workspace.onDidOpenTextDocument((document) => scheduler.schedule(document)),
            this.vscode.workspace.onDidChangeTextDocument((event) => {
                scheduler.schedule(event.document);
                this.schedulePreviewRefresh(context, event.document, 250);
                this.editorStyleController.refreshDocument(context, event.document);
            }),
            this.vscode.workspace.onDidSaveTextDocument((document) => {
                scheduler.schedule(document, 0);
                this.refreshPreviewPanelsForDocument(context, document);
                this.editorStyleController.refreshDocument(context, document);
                this.editorStyleController.handleStyleDocumentSave(context, document, this.refreshVisiblePreviewPanels);
            }),
            this.vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
            this.vscode.window.onDidChangeTextEditorSelection((event) => this.previewRevealBridge.handleSelectionChange(context, event)),
            this.vscode.window.onDidChangeVisibleTextEditors(() => this.editorStyleController.refreshVisibleEditors(context)),
            this.vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration("inscape")) {
                    this.refreshVisibleDocuments(scheduler);
                    this.editorStyleController.refreshVisibleEditors(context);
                }
            }),
            this.vscode.languages.registerCompletionItemProvider(this.languageSelector, this.dslScriptCompletionProvider, ">", ".", ":", "\uFF1A", "[", " "),
            this.vscode.languages.registerDocumentSymbolProvider(this.languageSelector, this.dslScriptDocumentSymbolProvider),
            this.vscode.languages.registerDefinitionProvider(this.languageSelector, this.dslScriptDefinitionProvider),
            this.vscode.languages.registerReferenceProvider(this.languageSelector, this.dslScriptReferenceProvider),
            this.vscode.languages.registerHoverProvider(this.languageSelector, this.dslScriptHoverProvider),
            this.vscode.languages.registerCodeLensProvider(this.languageSelector, this.dslScriptCodeLensProvider),
            this.vscode.commands.registerCommand("inscape.showNodeIncomingReferences", (uri, position, locations) => this.showNodeIncomingReferences(uri, position, locations)),
            this.vscode.commands.registerCommand("inscape.openPreview", () => this.previewCommand.open()),
            this.vscode.commands.registerCommand("inscape.togglePreview", () => this.previewCommand.toggle()),
            this.vscode.commands.registerCommand("inscape.revealSelectionInPreview", () => this.previewCommand.revealSelection(context)),
            this.vscode.commands.registerCommand("inscape.openToolsMenu", () => this.editorAuthoringCommand.openMenu(context)),
            this.vscode.commands.registerCommand("inscape.insertNodeTitle", () => this.editorAuthoringCommand.insertNodeTitle()),
            this.vscode.commands.registerCommand("inscape.updateNodeMap", () => this.editorAuthoringCommand.updateNodeMap(context)),
            this.vscode.commands.registerCommand("inscape.openEditorStyle", () => this.editorAuthoringCommand.openEditorStyle()),
            this.vscode.commands.registerCommand("inscape.openPreviewStyle", () => this.editorAuthoringCommand.openPreviewStyle()),
            this.vscode.commands.registerCommand("inscape.openQuickSyntaxGuide", () => this.editorAuthoringCommand.openQuickSyntaxGuide()),
            this.vscode.commands.registerCommand("inscape.revealInPreview", (payload) => this.previewRevealBridge.reveal(context, payload)),
            this.vscode.commands.registerCommand("inscape.extractLocalization", () => this.localizationCommand.export(context)),
            this.vscode.commands.registerCommand("inscape.updateLocalization", () => this.localizationCommand.update(context)),
            this.vscode.commands.registerCommand("inscape.showHostSchemaCapabilities", () => this.hostSchemaCommand.showCapabilities()),
            this.vscode.window.registerCustomEditorProvider(
                "inscape.preview",
                new PreviewEditorProvider({
                    path: this.path,
                    context,
                    previewPanels: this.previewPanels,
                    normalizePath: this.normalizePath,
                    createPreviewLoadingHtml: (workspaceName) => this.previewHtmlProvider.createLoadingHtml(workspaceName),
                    refreshPreviewPanel: this.refreshPreviewPanel,
                    previewRevealBridge: this.previewRevealBridge,
                    openPreviewSource: (source, webviewPanel) => this.previewSourceController.openSource(source, webviewPanel)
                }),
                {
                    webviewOptions: {
                        retainContextWhenHidden: true
                    },
                    supportsMultipleEditorsPerDocument: true
                }
            )
        );

        this.refreshVisibleDocuments(scheduler);
        this.editorStyleController.refreshVisibleEditors(context);
    }
}

module.exports = {
    ExtensionRegistrationController
};
