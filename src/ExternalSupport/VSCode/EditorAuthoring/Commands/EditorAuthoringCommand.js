"use strict";

class EditorAuthoringCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.childProcess = dependencies.childProcess;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.isInscapeDocument = dependencies.isInscapeDocument;
        this.previewCommand = dependencies.previewCommand;
        this.localizationCommand = dependencies.localizationCommand;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.dslScriptNodeProvider = dependencies.dslScriptNodeProvider;
        this.defaultEditorStyle = dependencies.defaultEditorStyle;
        this.defaultPreviewStyle = dependencies.defaultPreviewStyle;
        this.writeTempDocument = dependencies.writeTempDocument;
        this.createTempPath = dependencies.createTempPath;
        this.resolveCliProjectPath = dependencies.resolveCliProjectPath;
        this.normalizePath = dependencies.normalizePath;
    }

    async openMenu(context) {
        const items = [
            {
                label: "$(play) 在预览中定位当前文本",
                description: "按当前光标或选区定位预览",
                action: () => this.previewCommand.revealSelection(context)
            },
            {
                label: "$(add) 插入剧情块标题",
                description: "同名标题会自动追加 _01",
                action: () => this.insertNodeTitle(context)
            },
            {
                label: "$(sync) 更新 Stable Node Map",
                description: "写入或更新 inscape.node-map.json",
                action: () => this.updateNodeMap(context)
            },
            {
                label: "$(warning) 审查 Stable Node Map 变更",
                description: "打开 rename / conflict / missing 审查报告",
                action: () => this.reviewNodeMap(context)
            },
            {
                label: "$(search) 审查本地化对齐候选",
                description: "生成 changed / conflict / stale 审查报告",
                action: () => this.localizationCommand.reviewAlignment(context)
            },
            {
                label: "$(symbol-color) 编辑器样式",
                description: "打开 inscape.editor-style.json",
                action: () => this.openEditorStyle()
            },
            {
                label: "$(paintcan) 预览样式",
                description: "打开 inscape.preview-style.json",
                action: () => this.openPreviewStyle()
            },
            {
                label: "$(book) 极简语法速查",
                description: "打开面向用户的语法速查文档",
                action: () => this.openQuickSyntaxGuide()
            }
        ];

        const selected = await this.vscode.window.showQuickPick(items, {
            placeHolder: "Inscape 工具菜单"
        });

        if (selected && typeof selected.action === "function") {
            await selected.action();
        }
    }

    async insertNodeTitle(context) {
        const editor = this.vscode.window.activeTextEditor;
        if (!editor || !this.isInscapeDocument(editor.document)) {
            this.vscode.window.showWarningMessage("Open an .inscape document before inserting a node title.");
            return;
        }

        const input = await this.vscode.window.showInputBox({
            prompt: "输入剧情块标题。同名标题会自动追加 _01。",
            placeHolder: "法庭开场",
            validateInput: (value) => {
                const title = this.normalizeTitle(value);
                if (!title) {
                    return "标题不能为空。";
                }
                if (!this.dslScriptNodeProvider.isValidTitle(title)) {
                    return "标题不能包含 /、\\、控制字符或 ->。";
                }
                return undefined;
            }
        });

        if (input === undefined) {
            return;
        }

        const title = this.normalizeTitle(input);
        const uniqueTitle = await this.createUniqueNodeTitle(editor.document, title);
        const insertText = this.createNodeTitleInsertion(editor.document, editor.selection.active, uniqueTitle);
        const didEdit = await editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, insertText);
        });

        if (didEdit) {
            await this.syncNodeMapAfterTitleInsert(context, editor.document);
        }
    }

    async updateNodeMap(context, options) {
        const invocationOptions = options || {};
        const workspaceFolder = invocationOptions.workspaceFolder || await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        try {
            const result = await this.runNodeMapUpdate(context, workspaceFolder, {
                activeDocument: invocationOptions.activeDocument,
                showProgress: invocationOptions.showProgress !== false,
                includeReviewReport: invocationOptions.includeReviewReport !== false
            });
            if (!result.nodeMapPath || invocationOptions.notifySuccess === false) {
                return;
            }

            const hasReviewWork = this.reportNeedsManualReview(result.report);
            const openNodeMapAction = invocationOptions.openOnSuccess === false ? undefined : "Open Node Map";
            const openReviewAction = hasReviewWork && result.reportPath ? "Open Review" : undefined;
            const reviewItemsAction = hasReviewWork && result.reportPath ? "Review Items" : undefined;
            const message = hasReviewWork
                ? this.createNodeMapReviewMessage(result)
                : "Inscape stable node map written to " + result.nodeMapPath;
            const selection = hasReviewWork
                ? await this.vscode.window.showWarningMessage(message, ...[reviewItemsAction, openReviewAction, openNodeMapAction].filter(Boolean))
                : openNodeMapAction
                    ? await this.vscode.window.showInformationMessage(message, openNodeMapAction)
                    : await this.vscode.window.showInformationMessage(message);

            if (selection === reviewItemsAction && result.reportPath && result.report) {
                await this.reviewNodeMapReport(result.report, result.nodeMapPath, result.reportPath);
                return;
            }

            if (selection === openReviewAction && result.reportPath && this.fs.existsSync(result.reportPath)) {
                await this.openFile(result.reportPath);
                return;
            }

            if (selection === openNodeMapAction && this.fs.existsSync(result.nodeMapPath)) {
                await this.openFile(result.nodeMapPath);
            }
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        }
    }

    async reviewNodeMap(context) {
        const workspaceFolder = await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        try {
            const result = await this.runNodeMapUpdate(context, workspaceFolder, {
                showProgress: true,
                includeReviewReport: true
            });

            if (!result.reportPath || !this.fs.existsSync(result.reportPath)) {
                this.vscode.window.showWarningMessage("Stable node map review report was not generated.");
                return;
            }

            const openReportAction = "Open Report";
            const openNodeMapAction = "Open Node Map";
            const reviewItemsAction = "Review Items";
            const selection = await this.vscode.window.showInformationMessage(
                this.createNodeMapReviewMessage(result),
                reviewItemsAction,
                openReportAction,
                openNodeMapAction
            );

            if (selection === reviewItemsAction && result.report) {
                await this.reviewNodeMapReport(result.report, result.nodeMapPath, result.reportPath);
                return;
            }

            if (selection === openReportAction) {
                await this.openFile(result.reportPath);
                return;
            }

            if (selection === openNodeMapAction && this.fs.existsSync(result.nodeMapPath)) {
                await this.openFile(result.nodeMapPath);
            }
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
        }
    }

    async openEditorStyle() {
        const workspaceFolder = await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const stylePath = await this.ensureStyleFile(workspaceFolder, "editor");
        if (!stylePath) {
            return;
        }

        await this.openFile(stylePath);
    }

    async openPreviewStyle() {
        const workspaceFolder = await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const stylePath = await this.ensureStyleFile(workspaceFolder, "preview");
        if (!stylePath) {
            return;
        }

        await this.openFile(stylePath);
    }

    async openQuickSyntaxGuide() {
        const workspaceFolder = await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        await this.openFile(this.path.join(workspaceFolder.uri.fsPath, "docs", "quick-syntax-guide.md"));
    }

    async createUniqueNodeTitle(document, title) {
        const nodes = await this.dslScriptNodeProvider.collectWorkspaceNodes(document);
        const used = new Set(nodes.map((node) => node.name));
        if (!used.has(title)) {
            return title;
        }

        for (let index = 1; index < 1000; index += 1) {
            const candidate = title + "_" + String(index).padStart(2, "0");
            if (!used.has(candidate)) {
                return candidate;
            }
        }

        return title + "_" + Date.now();
    }

    createNodeTitleInsertion(document, position, title) {
        const currentLine = document.lineAt(position.line).text;
        const prefix = position.character === 0 && currentLine.trim().length === 0
            ? ""
            : "\n\n";
        return prefix + "# " + title + "\n\n";
    }

    normalizeTitle(value) {
        return String(value || "").trim().replace(/\s+/g, " ");
    }

    async resolvePreferredWorkspaceFolder() {
        const activeDocument = this.vscode.window.activeTextEditor ? this.vscode.window.activeTextEditor.document : undefined;
        if (activeDocument) {
            const folder = this.vscode.workspace.getWorkspaceFolder(activeDocument.uri);
            if (folder) {
                return folder;
            }
        }

        return this.selectWorkspaceFolder();
    }

    async syncNodeMapAfterTitleInsert(context, document) {
        if (!context || !document) {
            return;
        }

        const workspaceFolder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return;
        }

        try {
            await this.runNodeMapUpdate(context, workspaceFolder, {
                activeDocument: document,
                showProgress: false,
                includeReviewReport: false
            });
        } catch (error) {
            const detail = error && error.message
                ? error.message
                : String(error);
            this.vscode.window.showWarningMessage("标题已插入，但 stable node map 自动同步失败：" + detail);
        }
    }

    async runNodeMapUpdate(context, workspaceFolder, options) {
        const invocationOptions = options || {};
        const activeDocument = this.resolveNodeMapActiveDocument(workspaceFolder, invocationOptions.activeDocument);
        let tempPath;
        let reportPath;

        try {
            if (activeDocument) {
                tempPath = this.writeTempDocument(activeDocument);
            }

            if (invocationOptions.includeReviewReport) {
                reportPath = this.createTempPath("node-map-review", ".json");
            }

            const invocation = this.createNodeMapInvocation(context, workspaceFolder, activeDocument, tempPath, reportPath);
            const output = invocationOptions.showProgress === false
                ? await this.execFile(invocation)
                : await this.vscode.window.withProgress({
                    location: this.vscode.ProgressLocation.Notification,
                    title: "Updating Inscape stable node map",
                    cancellable: false
                }, () => this.execFile(invocation));

            const nodeMapPath = this.normalizeNodeMapPath(output) || this.path.join(workspaceFolder.uri.fsPath, "inscape.node-map.json");
            return {
                nodeMapPath,
                reportPath: reportPath && this.fs.existsSync(reportPath) ? reportPath : undefined,
                report: reportPath && this.fs.existsSync(reportPath) ? await this.readNodeMapReport(reportPath) : undefined
            };
        } finally {
            if (tempPath) {
                this.fs.unlink(tempPath, () => { });
            }
        }
    }

    resolveNodeMapActiveDocument(workspaceFolder, preferredDocument) {
        if (preferredDocument
            && this.isInscapeDocument(preferredDocument)
            && this.isDocumentInWorkspaceFolder(preferredDocument, workspaceFolder)) {
            return preferredDocument;
        }

        const editorDocument = this.vscode.window.activeTextEditor ? this.vscode.window.activeTextEditor.document : undefined;
        if (editorDocument
            && this.isInscapeDocument(editorDocument)
            && this.isDocumentInWorkspaceFolder(editorDocument, workspaceFolder)) {
            return editorDocument;
        }

        return undefined;
    }

    createNodeMapInvocation(context, workspaceFolder, activeDocument, tempPath, reportPath) {
        const configuration = this.vscode.workspace.getConfiguration("inscape", workspaceFolder.uri);
        const command = configuration.get("compiler.command", "dotnet");
        const cliProject = this.resolveCliProjectPath(context, workspaceFolder.uri.fsPath);
        const args = [
            "run",
            "--project",
            cliProject,
            "--",
            "update-node-map-project",
            workspaceFolder.uri.fsPath
        ];

        if (activeDocument && tempPath) {
            args.push("--override", activeDocument.uri.fsPath, tempPath);
        }

        if (reportPath) {
            args.push("--report", reportPath);
        }

        return {
            command,
            args,
            cwd: workspaceFolder.uri.fsPath
        };
    }

    isDocumentInWorkspaceFolder(document, workspaceFolder) {
        const folder = this.vscode.workspace.getWorkspaceFolder(document.uri);
        return !!folder && this.normalizePath(folder.uri.fsPath) === this.normalizePath(workspaceFolder.uri.fsPath);
    }

    normalizeNodeMapPath(output) {
        const candidates = String(output || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const candidate = candidates.length > 0
            ? candidates[candidates.length - 1]
            : undefined;
        return candidate || undefined;
    }

    async readNodeMapReport(reportPath) {
        const text = await this.fs.promises.readFile(reportPath, "utf8");
        return JSON.parse(text);
    }

    reportNeedsManualReview(report) {
        if (!report || !report.summary) {
            return false;
        }

        return Number(report.summary.manualReviewCount || 0) > 0
            || Number(report.summary.conflictNodeCount || 0) > 0;
    }

    createNodeMapReviewMessage(result) {
        const summary = result && result.report && result.report.summary
            ? result.report.summary
            : {};
        const renamed = Number(summary.renamedNodeCount || 0);
        const manualReview = Number(summary.manualReviewCount || 0);
        const conflicts = Number(summary.conflictNodeCount || 0);
        const missing = Number(summary.missingNodeCount || 0);
        return "Stable node map review: "
            + renamed + " renamed, "
            + manualReview + " manual review, "
            + conflicts + " conflicts, "
            + missing + " missing.";
    }

    async reviewNodeMapReport(report, nodeMapPath, reportPath) {
        const items = report && Array.isArray(report.items) ? report.items : [];
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Stable node map review report has no items.");
            return;
        }

        const picks = items.map((item) => this.createNodeMapReviewPick(item));
        const selected = await this.vscode.window.showQuickPick(picks, {
            placeHolder: "Select a stable node map review item"
        });
        if (!selected || !selected.item) {
            return;
        }

        const action = await this.vscode.window.showQuickPick(this.createNodeMapReviewActions(selected.item, nodeMapPath, reportPath), {
            placeHolder: "Jump to current title, a candidate title, or open supporting files"
        });
        if (!action) {
            return;
        }

        if (action.location) {
            await this.openLocation(this.locationFromPayload(action.location));
            return;
        }

        if (action.filePath) {
            await this.openFile(action.filePath);
        }
    }

    createNodeMapReviewPick(item) {
        const sourceSummary = this.formatReviewSource(item.sourcePath, item.sourceLine);
        const previousTitle = item.previousTitle
            ? "previous: " + item.previousTitle
            : "previous: (none)";
        const candidateSummary = Array.isArray(item.candidates) && item.candidates.length > 0
            ? item.candidates.slice(0, 2).map((candidate) => this.formatNodeMapCandidate(candidate)).join(" | ")
            : "candidates: none";
        return {
            label: "[" + String(item.kind || "unknown") + "] " + String(item.title || "(untitled)"),
            description: String(item.message || ""),
            detail: sourceSummary + " | " + previousTitle + " | " + candidateSummary,
            item
        };
    }

    createNodeMapReviewActions(item, nodeMapPath, reportPath) {
        const actions = [
            {
                label: "Jump to current title",
                description: this.formatReviewSource(item.sourcePath, item.sourceLine),
                detail: item.message || "",
                location: {
                    sourcePath: String(item.sourcePath || ""),
                    line: Math.max(0, Number(item.sourceLine || 1) - 1),
                    character: 0,
                    length: String(item.title || "").length
                }
            }
        ];

        if (nodeMapPath && this.fs.existsSync(nodeMapPath)) {
            actions.push({
                label: "Open node map",
                description: this.path.basename(nodeMapPath),
                filePath: nodeMapPath
            });
        }

        if (reportPath && this.fs.existsSync(reportPath)) {
            actions.push({
                label: "Open raw report",
                description: this.path.basename(reportPath),
                filePath: reportPath
            });
        }

        if (Array.isArray(item.candidates)) {
            for (let i = 0; i < item.candidates.length; i += 1) {
                const candidate = item.candidates[i];
                actions.push({
                    label: "Candidate " + String(i + 1) + ": " + String(candidate.title || "(untitled)"),
                    description: "score " + String(candidate.score || 0),
                    detail: this.formatReviewSource(candidate.sourcePath, candidate.sourceLine) + " | stable id " + String(candidate.stableId || ""),
                    location: {
                        sourcePath: String(candidate.sourcePath || ""),
                        line: Math.max(0, Number(candidate.sourceLine || 1) - 1),
                        character: 0,
                        length: String(candidate.title || "").length
                    }
                });
            }
        }

        return actions;
    }

    formatNodeMapCandidate(candidate) {
        return String(candidate.title || "") + " @score " + String(candidate.score || 0);
    }

    formatReviewSource(sourcePath, line) {
        return this.path.basename(String(sourcePath || "")) + ":" + String(line || 1);
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

    async ensureStyleFile(workspaceFolder, kind) {
        const workspacePath = workspaceFolder.uri.fsPath;
        const configPath = this.path.join(workspacePath, "inscape.config.json");
        let config = {};

        if (this.fs.existsSync(configPath)) {
            try {
                config = JSON.parse(await this.fs.promises.readFile(configPath, "utf8"));
            } catch {
                config = {};
            }
        }

        if (!config.styles || typeof config.styles !== "object") {
            config.styles = {};
        }

        const defaultRelativePath = kind === "editor"
            ? this.path.join("config", "inscape.editor-style.json")
            : this.path.join("config", "inscape.preview-style.json");
        const configuredRelativePath = typeof config.styles[kind] === "string" && config.styles[kind].trim()
            ? config.styles[kind].trim()
            : defaultRelativePath;
        const targetPath = this.path.isAbsolute(configuredRelativePath)
            ? configuredRelativePath
            : this.path.resolve(this.path.dirname(configPath), configuredRelativePath);

        config.styles[kind] = this.path.isAbsolute(configuredRelativePath)
            ? configuredRelativePath
            : configuredRelativePath.replace(/\\/g, "/");

        await this.fs.promises.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf8");

        await this.fs.promises.mkdir(this.path.dirname(targetPath), { recursive: true });
        if (!this.fs.existsSync(targetPath)) {
            const content = kind === "editor"
                ? JSON.stringify(this.defaultEditorStyle, null, 2) + "\n"
                : JSON.stringify(this.defaultPreviewStyle, null, 2) + "\n";
            await this.fs.promises.writeFile(targetPath, content, "utf8");
        }

        return targetPath;
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
    EditorAuthoringCommand
};
