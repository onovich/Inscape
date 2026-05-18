"use strict";

class LocalizationCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.writeTempDocument = dependencies.writeTempDocument;
        this.resolveCliProjectPath = dependencies.resolveCliProjectPath;
        this.normalizePath = dependencies.normalizePath;
    }

    async export(context) {
        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const outputUri = await this.vscode.window.showSaveDialog({
            defaultUri: this.vscode.Uri.file(this.path.join(workspaceFolder.uri.fsPath, "artifacts", "l10n.csv")),
            filters: {
                "CSV": ["csv"]
            },
            saveLabel: "Export Localization"
        });

        if (!outputUri) {
            return;
        }

        await this.run(context, workspaceFolder, {
            commandName: "extract-l10n-project",
            outputPath: outputUri.fsPath,
            progressTitle: "Exporting Inscape localization CSV"
        });
    }

    async update(context) {
        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const previousUris = await this.vscode.window.showOpenDialog({
            defaultUri: this.vscode.Uri.file(this.path.join(workspaceFolder.uri.fsPath, "artifacts")),
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                "CSV": ["csv"]
            },
            openLabel: "Select Previous Localization CSV"
        });

        if (!previousUris || previousUris.length === 0) {
            return;
        }

        const outputUri = await this.vscode.window.showSaveDialog({
            defaultUri: this.vscode.Uri.file(this.path.join(workspaceFolder.uri.fsPath, "artifacts", "l10n.updated.csv")),
            filters: {
                "CSV": ["csv"]
            },
            saveLabel: "Update Localization"
        });

        if (!outputUri) {
            return;
        }

        await this.run(context, workspaceFolder, {
            commandName: "update-l10n-project",
            previousPath: previousUris[0].fsPath,
            outputPath: outputUri.fsPath,
            progressTitle: "Updating Inscape localization CSV"
        });
    }

    async run(context, workspaceFolder, options) {
        const editorDocument = this.vscode.window.activeTextEditor ? this.vscode.window.activeTextEditor.document : undefined;
        const activeDocument = editorDocument
            && this.isInscapeDocument(editorDocument)
            && this.isDocumentInWorkspaceFolder(editorDocument, workspaceFolder)
            ? this.vscode.window.activeTextEditor.document
            : undefined;
        let tempPath;

        try {
            if (activeDocument) {
                tempPath = this.writeTempDocument(activeDocument);
            }

            const invocation = this.createInvocation(context, workspaceFolder, options, activeDocument, tempPath);
            await this.vscode.window.withProgress({
                location: this.vscode.ProgressLocation.Notification,
                title: options.progressTitle,
                cancellable: false
            }, () => this.execFile(invocation));

            this.vscode.window.showInformationMessage("Inscape localization CSV written to " + options.outputPath);
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        } finally {
            if (tempPath) {
                this.fs.unlink(tempPath, () => { });
            }
        }
    }

    createInvocation(context, workspaceFolder, options, activeDocument, tempPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", workspaceFolder.uri);
        const command = configuration.get("compiler.command", "dotnet");
        const cliProject = this.resolveCliProjectPath(context, workspaceFolder.uri.fsPath);
        const args = [
            "run",
            "--project",
            cliProject,
            "--",
            options.commandName,
            workspaceFolder.uri.fsPath
        ];

        if (options.previousPath) {
            args.push("--from", options.previousPath);
        }

        if (activeDocument && tempPath) {
            args.push("--override", activeDocument.uri.fsPath, tempPath);
        }

        args.push("-o", options.outputPath);

        return {
            command,
            args,
            cwd: workspaceFolder.uri.fsPath
        };
    }

    isDocumentInWorkspaceFolder(document, workspaceFolder) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        return folder && this.normalizePath(folder.uri.fsPath) === this.normalizePath(workspaceFolder.uri.fsPath);
    }

    execFile(invocation) {
        return new Promise((resolve, reject) => {
            this.childProcess.execFile(invocation.command, invocation.args, {
                cwd: invocation.cwd,
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 8
            }, (error, stdout, stderr) => {
                if (error) {
                    const detail = stderr && stderr.trim()
                        ? stderr.trim()
                        : (stdout && stdout.trim() ? stdout.trim() : error.message);
                    reject(new Error(detail));
                    return;
                }

                resolve(stdout);
            });
        });
    }

}

module.exports = {
    LocalizationCommand
};
