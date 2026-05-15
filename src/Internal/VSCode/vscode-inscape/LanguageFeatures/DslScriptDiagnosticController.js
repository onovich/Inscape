"use strict";

class DslScriptDiagnosticController {
    constructor(dependencies) {
        this.fs = dependencies.fs;
        this.os = dependencies.os;
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.normalizePath = dependencies.normalizePath;
        this.clamp = dependencies.clamp;
    }

    writeTempDocument(document) {
        const directory = this.path.join(this.os.tmpdir(), "inscape-vscode");
        this.fs.mkdirSync(directory, { recursive: true });

        const baseName = this.path.basename(document.uri.fsPath || "document.inscape");
        const fileName = process.pid + "-" + Date.now() + "-" + Math.random().toString(16).slice(2) + "-" + baseName;
        const tempPath = this.path.join(directory, fileName);
        this.fs.writeFileSync(tempPath, document.getText(), "utf8");
        return tempPath;
    }

    createCompilerInvocation(context, document, tempPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", document.uri);
        const command = configuration.get("compiler.command", "dotnet");
        const configuredArgs = configuration.get("compiler.args", []);
        const rawArgs = Array.isArray(configuredArgs) ? configuredArgs : [];
        const workspaceFolder = this.getWorkspaceFolder(context, document);
        const variables = {
            "${workspaceFolder}": workspaceFolder,
            "${extensionPath}": context.extensionPath,
            "${file}": tempPath,
            "${documentFile}": document.uri.fsPath
        };

        const args = rawArgs.map((value) => this.replaceVariables(String(value), variables));
        return {
            command,
            args,
            cwd: workspaceFolder
        };
    }

    applyDiagnostics(collection, currentDocument, diagnostics) {
        const documents = this.vscode.workspace.textDocuments.filter((document) => this.isInscapeDocument(document));
        const mappedUris = new Set();

        for (const document of documents) {
            const mapped = this.mapDiagnosticsForDocument(document, diagnostics);
            collection.set(document.uri, mapped);
            mappedUris.add(document.uri.toString());
        }

        if (!mappedUris.has(currentDocument.uri.toString())) {
            collection.set(currentDocument.uri, this.mapDiagnosticsForDocument(currentDocument, diagnostics));
        }
    }

    createExtensionDiagnostic(document, message) {
        const line = document.lineCount > 0 ? 0 : 0;
        const range = document.lineCount > 0 ? document.lineAt(line).range : new this.vscode.Range(0, 0, 0, 1);
        const diagnostic = new this.vscode.Diagnostic(range, message, this.vscode.DiagnosticSeverity.Warning);
        diagnostic.source = "Inscape VSCode";
        return diagnostic;
    }

    getWorkspaceFolder(context, document) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (folder) {
            return folder.uri.fsPath;
        }

        if (this.vscode.workspace.workspaceFolders && this.vscode.workspace.workspaceFolders.length > 0) {
            return this.vscode.workspace.workspaceFolders[0].uri.fsPath;
        }

        return this.path.resolve(context.extensionPath, "..", "..");
    }

    replaceVariables(value, variables) {
        let result = value;
        for (const variableName of Object.keys(variables)) {
            result = result.split(variableName).join(variables[variableName]);
        }
        return result;
    }

    mapDiagnosticsForDocument(document, diagnostics) {
        return diagnostics.filter((diagnostic) => this.diagnosticMatchesDocument(diagnostic, document))
            .map((diagnostic) => {
            const line = this.clamp((diagnostic.line || 1) - 1, 0, Math.max(0, document.lineCount - 1));
            const textLine = document.lineAt(line);
            const character = this.clamp((diagnostic.column || 1) - 1, 0, textLine.text.length);
            const end = character < textLine.text.length ? textLine.text.length : Math.min(character + 1, textLine.text.length + 1);
            const range = new this.vscode.Range(line, character, line, end);
            const vscodeDiagnostic = new this.vscode.Diagnostic(
                range,
                diagnostic.message || "Inscape diagnostic",
                this.mapSeverity(diagnostic.severity)
            );

            vscodeDiagnostic.code = diagnostic.code;
            vscodeDiagnostic.source = "Inscape";
            return vscodeDiagnostic;
        });
    }

    diagnosticMatchesDocument(diagnostic, document) {
        if (!diagnostic || !diagnostic.sourcePath) {
            return true;
        }

        return this.normalizePath(diagnostic.sourcePath) === this.normalizePath(document.uri.fsPath);
    }

    mapSeverity(severity) {
        const value = String(severity || "").toLowerCase();
        if (value === "error") {
            return this.vscode.DiagnosticSeverity.Error;
        }
        if (value === "warning") {
            return this.vscode.DiagnosticSeverity.Warning;
        }
        if (value === "information" || value === "info") {
            return this.vscode.DiagnosticSeverity.Information;
        }
        return this.vscode.DiagnosticSeverity.Hint;
    }
}

module.exports = {
    DslScriptDiagnosticController
};
