"use strict";

class DslScriptDiagnosticScheduler {

    constructor(dependencies) {
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.vscode = dependencies.vscode;
        this.context = dependencies.context;
        this.diagnostics = dependencies.diagnostics;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.writeTempDocument = dependencies.writeTempDocument;
        this.createCompilerInvocation = dependencies.createCompilerInvocation;
        this.createExtensionDiagnostic = dependencies.createExtensionDiagnostic;
        this.applyDiagnostics = dependencies.applyDiagnostics;
        this.timers = new Map();
        this.runIds = new Map();
    }

    schedule(document, delayOverride) {
        if (!this.isInscapeDocument(document)) {
            return;
        }

        const configuration = this.vscode.workspace.getConfiguration("inscape", document.uri);
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
            tempPath = this.writeTempDocument(document);
        } catch (error) {
            this.diagnostics.set(document.uri, [
                this.createExtensionDiagnostic(document, "Unable to prepare Inscape diagnostics: " + error.message)
            ]);
            return;
        }

        const invocation = this.createCompilerInvocation(this.context, document, tempPath);
        this.childProcess.execFile(invocation.command, invocation.args, {
            cwd: invocation.cwd,
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 8
        }, (error, stdout, stderr) => {
            this.fs.unlink(tempPath, () => { });

            if (this.runIds.get(key) !== runId) {
                return;
            }

            if (!stdout || !stdout.trim()) {
                const message = stderr && stderr.trim()
                    ? stderr.trim()
                    : (error && error.message ? error.message : "Inscape compiler produced no diagnostic output.");
                this.diagnostics.set(document.uri, [
                    this.createExtensionDiagnostic(document, message)
                ]);
                return;
            }

            try {
                const payload = JSON.parse(stdout);
                this.applyDiagnostics(this.diagnostics, document, payload.diagnostics || []);
            } catch (parseError) {
                this.diagnostics.set(document.uri, [
                    this.createExtensionDiagnostic(document, "Unable to parse Inscape diagnostics: " + parseError.message)
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

module.exports = {
    DslScriptDiagnosticScheduler
};
