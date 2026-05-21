"use strict";

class LocalizationCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.localizationReviewController = dependencies.localizationReviewController;
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

    async reviewAlignment(context) {
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

        const formatPick = await this.vscode.window.showQuickPick([
            {
                label: "Text Review (Recommended)",
                format: "text",
                extension: ".txt",
                description: "Human-readable summary with candidates and reasons"
            },
            {
                label: "JSON Report",
                format: "json",
                extension: ".json",
                description: "Structured report for tooling and later UI"
            }
        ], {
            placeHolder: "Choose localization review report format"
        });

        if (!formatPick) {
            return;
        }

        const defaultFileName = formatPick.format === "text"
            ? "l10n-review.txt"
            : "l10n-review.json";
        const outputUri = await this.vscode.window.showSaveDialog({
            defaultUri: this.vscode.Uri.file(this.path.join(workspaceFolder.uri.fsPath, "artifacts", defaultFileName)),
            filters: formatPick.format === "text"
                ? { "Text": ["txt"] }
                : { "JSON": ["json"] },
            saveLabel: "Review Localization Alignment"
        });

        if (!outputUri) {
            return;
        }

        await this.run(context, workspaceFolder, {
            commandName: "audit-l10n-alignment-project",
            previousPath: previousUris[0].fsPath,
            outputPath: outputUri.fsPath,
            format: formatPick.format,
            progressTitle: "Reviewing Inscape localization alignment",
            successMessage: "Inscape localization alignment report written to " + outputUri.fsPath,
            successActions: formatPick.format === "json"
                ? ["Review Items", "Open Report"]
                : ["Open Report"]
        });
    }

    async refreshLineState(context) {
        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const reportUri = await this.vscode.window.showSaveDialog({
            defaultUri: this.vscode.Uri.file(this.path.join(workspaceFolder.uri.fsPath, "artifacts", "l10n-line-refresh.json")),
            filters: {
                "JSON": ["json"]
            },
            saveLabel: "Refresh Localization Line State"
        });

        if (!reportUri) {
            return;
        }

        await this.run(context, workspaceFolder, {
            commandName: "refresh-l10n-line-map-project",
            reportPath: reportUri.fsPath,
            workspaceFolderPath: workspaceFolder.uri.fsPath,
            progressTitle: "Refreshing Inscape localization line state",
            successMessage: "Inscape localization line refresh report written to " + reportUri.fsPath,
            successActions: ["Open Report", "Show Summary", "Show Details", "Restore Backup"],
            lineMapPath: this.resolveLineMapPath(workspaceFolder.uri.fsPath)
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

            const actions = Array.isArray(options.successActions) ? options.successActions : [];
            const selection = actions.length > 0
                ? await this.vscode.window.showInformationMessage(options.successMessage || ("Inscape localization CSV written to " + options.outputPath), ...actions)
                : await this.vscode.window.showInformationMessage(options.successMessage || ("Inscape localization CSV written to " + options.outputPath));
            await this.handleSuccessSelection(selection, options);
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        } finally {
            if (tempPath) {
                this.fs.unlink(tempPath, () => { });
            }
        }
    }

    async handleSuccessSelection(selection, options) {
        if (selection === "Review Items") {
            await this.localizationReviewController.reviewAlignmentReport(options.outputPath);
            return;
        }

        if (selection === "Open Report") {
            await this.openFile(options.outputPath);
        }

        if (selection === "Show Summary" && options.reportPath) {
            await this.showLineRefreshSummary(options.reportPath);
        }

        if (selection === "Show Details" && options.reportPath) {
            await this.showLineRefreshDetails(options.reportPath);
        }

        if (selection === "Restore Backup") {
            await this.restoreLineMapBackup(options, options.workspaceFolderPath);
        }
    }

    async showLineRefreshSummary(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        const report = JSON.parse(text);
        const canContinue = await this.handleLineMapDriftDecision(report, reportPath, null, null);
        if (!canContinue) {
            return;
        }
        const blocks = Array.isArray(report && report.blocks) ? report.blocks : [];
        let added = 0;
        let changed = 0;
        let removed = 0;
        for (let i = 0; i < blocks.length; i += 1) {
            const changes = Array.isArray(blocks[i].changes) ? blocks[i].changes : [];
            for (let changeIndex = 0; changeIndex < changes.length; changeIndex += 1) {
                switch (changes[changeIndex].kind) {
                    case "added":
                        added += 1;
                        break;
                    case "changed":
                        changed += 1;
                        break;
                    case "removed":
                        removed += 1;
                        break;
                }
            }
        }

        await this.vscode.window.showInformationMessage("Localization line refresh summary: changed " + changed + ", added " + added + ", removed " + removed + ".", "Open Report").then(async (selection) => {
            if (selection === "Open Report") {
                await this.openFile(reportPath);
            }
        });
    }

    async showLineRefreshDetails(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        const report = JSON.parse(text);
        const canContinue = await this.handleLineMapDriftDecision(report, reportPath, null, null);
        if (!canContinue) {
            return;
        }
        const blocks = Array.isArray(report && report.blocks) ? report.blocks : [];
        const picks = [];
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
            const block = blocks[blockIndex];
            const changes = Array.isArray(block.changes) ? block.changes : [];
            for (let i = 0; i < changes.length; i += 1) {
                const change = changes[i];
                picks.push({
                    label: "[" + String(change.kind || "change") + "] " + String(block.blockId || "(unknown block)"),
                    description: String(change.summary || ""),
                    detail: String(change.blockTitle || ""),
                    change,
                    sourcePath: String(block.sourcePath || ""),
                    lineNumber: Number(change.lineNumber || change.oldLineNumber || 1)
                });
            }
        }

        if (picks.length === 0) {
            await this.vscode.window.showInformationMessage("Localization line refresh found no changes.");
            return;
        }

        const selection = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Review localization line refresh changes"
        });
        if (selection) {
            await this.openLineRefreshChange(selection, reportPath);
        }
    }

    async detectLineMapDrift(workspaceFolderPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", this.vscode.Uri.file(workspaceFolderPath));
        const configured = configuration.get("localization.lineMap", "");
        const lineMapPath = configured && configured.length > 0
            ? this.path.isAbsolute(configured)
                ? configured
                : this.path.resolve(workspaceFolderPath, configured)
            : this.path.join(workspaceFolderPath, "inscape.line-map.json");
        if (!this.fs.existsSync(lineMapPath)) {
            return false;
        }

        const text = await this.fs.promises.readFile(lineMapPath, "utf8");
        const lineMap = JSON.parse(text);
        return !lineMap.lastSourceFingerprint || lineMap.lastSourceFingerprint.length === 0;
    }

    async restoreLineMapBackup(options, workspaceFolderPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", this.vscode.Uri.file(workspaceFolderPath));
        const configured = configuration.get("localization.lineMap", "");
        const lineMapPath = configured && configured.length > 0
            ? this.path.isAbsolute(configured)
                ? configured
                : this.path.resolve(workspaceFolderPath, configured)
            : this.path.join(workspaceFolderPath, "inscape.line-map.json");
        const backupPath = lineMapPath + ".backup";
        if (!this.fs.existsSync(backupPath)) {
            this.vscode.window.showWarningMessage("No localization line map backup was found.");
            return;
        }

        const text = await this.fs.promises.readFile(backupPath, "utf8");
        await this.fs.promises.writeFile(lineMapPath, text, "utf8");
        const selection = await this.vscode.window.showInformationMessage("Restored localization line map backup.", "Open Line Map");
        if (selection === "Open Line Map") {
            await this.openFile(lineMapPath);
        }
    }

    async handleLineMapDriftDecision(report, reportPath, lineMapPath, workspaceFolderPath) {
        if (!report.status || !report.status.hasDrift) {
            return true;
        }

        const selection = await this.vscode.window.showWarningMessage(
            (report.status.message || "Localization line sidecar drift was detected.")
                + (report.status.recommendation ? " " + report.status.recommendation : ""),
            "Continue",
            "Show Details",
            "Restore Backup",
            "Cancel"
        );

        if (selection === "Continue") {
            return true;
        }

        if (selection === "Show Details" && reportPath) {
            await this.openFile(reportPath);
            return false;
        }

        if (selection === "Restore Backup" && workspaceFolderPath) {
            await this.restoreLineMapBackup({ workspaceFolderPath }, workspaceFolderPath);
            return false;
        }

        return false;
    }

    resolveLineMapPath(workspaceFolderPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", this.vscode.Uri.file(workspaceFolderPath));
        const configured = configuration.get("localization.lineMap", "");
        return configured && configured.length > 0
            ? this.path.isAbsolute(configured)
                ? configured
                : this.path.resolve(workspaceFolderPath, configured)
            : this.path.join(workspaceFolderPath, "inscape.line-map.json");
    }

    async openLineRefreshChange(selection, reportPath) {
        const reportDirectory = this.path.dirname(reportPath);
        const workspaceDirectory = this.path.dirname(reportDirectory);
        const sourcePath = selection.sourcePath || "";
        if (!sourcePath) {
            return;
        }

        const resolvedPath = this.path.isAbsolute(sourcePath)
            ? sourcePath
            : this.path.resolve(workspaceDirectory, sourcePath);
        const document = await this.vscode.workspace.openTextDocument(this.vscode.Uri.file(resolvedPath));
        const line = Math.max(0, Number(selection.lineNumber || 1) - 1);
        const editor = await this.vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
        });
        const range = new this.vscode.Range(line, 0, line, 0);
        editor.selection = new this.vscode.Selection(range.start, range.end);
        editor.revealRange(range, this.vscode.TextEditorRevealType.InCenter);
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

        if (options.format) {
            args.push("--format", options.format);
        }

        if (options.reportPath) {
            args.push("--report", options.reportPath);
        }

        if (activeDocument && tempPath) {
            args.push("--override", activeDocument.uri.fsPath, tempPath);
        }

        if (options.outputPath) {
            args.push("-o", options.outputPath);
        }

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

    async openFile(filePath) {
        const document = await this.vscode.workspace.openTextDocument(this.vscode.Uri.file(filePath));
        await this.vscode.window.showTextDocument(document, {
            preview: false,
            preserveFocus: false
        });
    }

}

module.exports = {
    LocalizationCommand
};
