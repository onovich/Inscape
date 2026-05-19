"use strict";

class LocalizationCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
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
            if (selection === "Review Items") {
                await this.reviewAlignmentReport(options.outputPath);
                return;
            }
            if (selection === "Open Report") {
                const document = await this.vscode.workspace.openTextDocument(this.vscode.Uri.file(options.outputPath));
                await this.vscode.window.showTextDocument(document, {
                    preview: false,
                    preserveFocus: false
                });
            }
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        } finally {
            if (tempPath) {
                this.fs.unlink(tempPath, () => { });
            }
        }
    }

    async reviewAlignmentReport(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        const report = JSON.parse(text);
        const items = Array.isArray(report && report.items) ? report.items : [];
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Localization alignment report has no items to review.");
            return;
        }

        const picks = items.map((item) => this.createReviewQuickPickItem(item));
        const selected = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Select a localization alignment item to jump to source"
        });
        if (!selected || !selected.location) {
            return;
        }

        if (selected.item && Array.isArray(selected.item.candidates) && selected.item.candidates.length > 0) {
            const reviewAction = await this.vscode.window.showQuickPick(this.createCandidateActionItems(selected.item), {
                placeHolder: "Review the current text or jump to a candidate source"
            });
            if (!reviewAction) {
                return;
            }

            if (reviewAction.location) {
                await this.openLocation(this.locationFromPayload(reviewAction.location));
                return;
            }
        }

        await this.openLocation(this.locationFromPayload(selected.location));
    }

    createReviewQuickPickItem(item) {
        const candidateSummary = Array.isArray(item.candidates) && item.candidates.length > 0
            ? item.candidates.slice(0, 2).map((candidate) => this.formatCandidateInline(candidate)).join(" | ")
            : "No candidates";
        const translationSummary = item.translation
            ? "translation: " + item.translation
            : "translation: (empty)";
        const sourceSummary = this.formatSourceSummary(item.sourcePath, item.line, item.column);
        const sourceLine = Number(item.line || 0) > 0 ? item.line : 1;
        const sourceColumn = Number(item.column || 0) > 0 ? item.column : 1;
        return {
            label: this.createReviewItemLabel(item),
            description: translationSummary,
            detail: sourceSummary + " | " + String(item.text || "") + " | " + candidateSummary,
            item,
            location: {
                sourcePath: String(item.sourcePath || ""),
                line: Math.max(0, sourceLine - 1),
                character: Math.max(0, sourceColumn - 1),
                length: String(item.text || "").length
            }
        };
    }

    createCandidateActionItems(item) {
        const actions = [
            {
                label: "Jump to current line",
                description: this.formatSourceSummary(item.sourcePath, item.line, item.column),
                detail: String(item.text || ""),
                location: {
                    sourcePath: String(item.sourcePath || ""),
                    line: Math.max(0, Number(item.line || 1) - 1),
                    character: Math.max(0, Number(item.column || 1) - 1),
                    length: String(item.text || "").length
                }
            }
        ];

        for (let i = 0; i < item.candidates.length; i += 1) {
            const candidate = item.candidates[i];
            actions.push({
                label: "Candidate " + String(i + 1) + ": " + this.formatCandidateStatus(candidate),
                description: candidate.translation || "(no translation)",
                detail: this.formatSourceSummary(candidate.sourcePath, candidate.line, candidate.column) + " | " + this.formatCandidateInline(candidate),
                location: {
                    sourcePath: String(candidate.sourcePath || ""),
                    line: Math.max(0, Number(candidate.line || 1) - 1),
                    character: Math.max(0, Number(candidate.column || 1) - 1),
                    length: String(candidate.text || "").length
                }
            });
        }

        return actions;
    }

    createReviewItemLabel(item) {
        const status = String(item.status || "unknown");
        const review = String(item.review || "");
        const node = String(item.nodeTitle || "(unknown node)");
        const candidateCount = Array.isArray(item.candidates) ? item.candidates.length : 0;
        return "[" + status + "] " + node + " - " + review + (candidateCount > 0 ? " (" + candidateCount + " candidates)" : "");
    }

    formatCandidateInline(candidate) {
        const similarity = candidate.similarity > 0
            ? " @" + Number(candidate.similarity).toFixed(3)
            : "";
        const reason = candidate.reason ? " {" + candidate.reason + "}" : "";
        const translation = candidate.translation ? " => " + candidate.translation : "";
        return String(candidate.text || "") + translation + similarity + reason;
    }

    formatCandidateStatus(candidate) {
        const similarity = candidate.similarity > 0
            ? "similarity " + Number(candidate.similarity).toFixed(3)
            : "candidate";
        return candidate.reason
            ? similarity + " / " + candidate.reason
            : similarity;
    }

    formatSourceSummary(sourcePath, line, column) {
        const fileName = this.path.basename(String(sourcePath || ""));
        return fileName + ":" + String(line || 1) + ":" + String(column || 1);
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
