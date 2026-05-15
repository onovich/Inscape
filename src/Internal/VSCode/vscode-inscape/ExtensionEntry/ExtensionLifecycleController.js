const { DslScriptDiagnosticScheduler } = require("../LanguageFeatures/DslScriptDiagnosticScheduler");

class ExtensionLifecycleController {
    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.diagnosticController = dependencies.diagnosticController;
        this.outputChannel = undefined;
    }

    activate(context, registrationController) {
        this.outputChannel = this.vscode.window.createOutputChannel("Inscape");
        const diagnostics = this.vscode.languages.createDiagnosticCollection("inscape");
        const scheduler = new DslScriptDiagnosticScheduler({
            childProcess: this.childProcess,
            fs: this.fs,
            vscode: this.vscode,
            context,
            diagnostics,
            isInscapeDocument: this.isInscapeDocument,
            writeTempDocument: (document) => this.diagnosticController.writeTempDocument(document),
            createCompilerInvocation: (diagnosticContext, document, tempPath) => this.diagnosticController.createCompilerInvocation(diagnosticContext, document, tempPath),
            createExtensionDiagnostic: (document, message) => this.diagnosticController.createExtensionDiagnostic(document, message),
            applyDiagnostics: (collection, currentDocument, diagnosticsPayload) => this.diagnosticController.applyDiagnostics(collection, currentDocument, diagnosticsPayload)
        });

        this.logOutput("Activated Inscape extension from " + context.extensionPath);

        registrationController.register(context, {
            outputChannel: this.outputChannel,
            diagnostics,
            scheduler
        });
    }

    logOutput(message) {
        if (!this.outputChannel) {
            return;
        }

        this.outputChannel.appendLine("[" + new Date().toISOString() + "] " + message);
    }
}

module.exports = {
    ExtensionLifecycleController
};
