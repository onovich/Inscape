"use strict";

class InscapeWorkspaceToolCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.path = dependencies.path;
        this.previewCommand = dependencies.previewCommand;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.defaultEditorStyle = dependencies.defaultEditorStyle;
        this.defaultPreviewStyle = dependencies.defaultPreviewStyle;
    }

    async openMenu(context) {
        const items = [
            {
                label: "$(play) 在预览中定位当前文本",
                description: "按当前光标或选区定位预览",
                action: () => this.previewCommand.revealSelection(context)
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

    async openEditorStyle() {
        const workspaceFolder = await this.resolvePreferredWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        const stylePath = await this.ensureStyleSupportFile(workspaceFolder, "editor");
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

        const stylePath = await this.ensureStyleSupportFile(workspaceFolder, "preview");
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

    async ensureStyleSupportFile(workspaceFolder, kind) {
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
    InscapeWorkspaceToolCommand
};
