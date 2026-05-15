const { DslScriptDiagnosticScheduler } = require("../LanguageFeatures/DslScriptDiagnosticScheduler");

class ExtensionLifecycleController {
    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.writeTempDocument = dependencies.writeTempDocument;
        this.createCompilerInvocation = dependencies.createCompilerInvocation;
        this.createExtensionDiagnostic = dependencies.createExtensionDiagnostic;
        this.applyDiagnostics = dependencies.applyDiagnostics;
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
            writeTempDocument: this.writeTempDocument,
            createCompilerInvocation: this.createCompilerInvocation,
            createExtensionDiagnostic: this.createExtensionDiagnostic,
            applyDiagnostics: this.applyDiagnostics
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
