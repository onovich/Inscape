"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");

const languageSelector = { language: "inscape" };

function activate(context) {
    const diagnostics = vscode.languages.createDiagnosticCollection("inscape");
    const scheduler = new DiagnosticScheduler(context, diagnostics);

    context.subscriptions.push(
        diagnostics,
        scheduler,
        vscode.workspace.onDidOpenTextDocument((document) => scheduler.schedule(document)),
        vscode.workspace.onDidChangeTextDocument((event) => scheduler.schedule(event.document)),
        vscode.workspace.onDidSaveTextDocument((document) => scheduler.schedule(document, 0)),
        vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("inscape")) {
                refreshVisibleDocuments(scheduler);
            }
        }),
        vscode.languages.registerCompletionItemProvider(languageSelector, new InscapeCompletionProvider(), ">", "."),
        vscode.languages.registerDocumentSymbolProvider(languageSelector, new InscapeDocumentSymbolProvider())
    );

    refreshVisibleDocuments(scheduler);
}

function deactivate() {
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
                const mapped = mapDiagnostics(document, payload.diagnostics || []);
                this.diagnostics.set(document.uri, mapped);
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

    provideCompletionItems(document, position) {
        if (!isInscapeDocument(document)) {
            return undefined;
        }

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (isJumpTargetContext(linePrefix)) {
            return collectNodeNames(document).map((name) => {
                const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Reference);
                item.insertText = name;
                item.detail = "Inscape node";
                item.sortText = "0_" + name;
                return item;
            });
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
                "Inscape node",
                vscode.SymbolKind.Namespace,
                range,
                range
            ));
        }

        return symbols;
    }
}

function refreshVisibleDocuments(scheduler) {
    for (const editor of vscode.window.visibleTextEditors) {
        scheduler.schedule(editor.document, 0);
    }
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

function mapDiagnostics(document, diagnostics) {
    return diagnostics.map((diagnostic) => {
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

function isJumpTargetContext(linePrefix) {
    return /(?:^|\s)->\s*[A-Za-z0-9_.-]*$/.test(linePrefix);
}

function collectNodeNames(document) {
    const names = [];
    const seen = new Set();
    const pattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;

    for (let line = 0; line < document.lineCount; line += 1) {
        const match = pattern.exec(document.lineAt(line).text);
        if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            names.push(match[1]);
        }
    }

    return names;
}

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(value, maximum));
}

module.exports = {
    activate,
    deactivate
};
