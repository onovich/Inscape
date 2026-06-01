"use strict";

class EditorAuthoringLocationProvider {
    constructor(dependencies) {
        this.path = dependencies.path;
        this.vscode = dependencies.vscode;
        this.normalizePath = dependencies.normalizePath;
    }

    findDialogueSeparatorIndex(line) {
        const halfWidth = line.indexOf(":");
        const fullWidth = line.indexOf("\uFF1A");
        if (halfWidth < 0) {
            return fullWidth;
        }

        if (fullWidth < 0) {
            return halfWidth;
        }

        return Math.min(halfWidth, fullWidth);
    }

    trimRange(line, start, end) {
        let rangeStart = Math.max(0, start);
        let rangeEnd = Math.max(rangeStart, end);

        while (rangeStart < rangeEnd && /\s/.test(line[rangeStart])) {
            rangeStart += 1;
        }

        while (rangeEnd > rangeStart && /\s/.test(line[rangeEnd - 1])) {
            rangeEnd -= 1;
        }

        if (rangeEnd <= rangeStart) {
            return undefined;
        }

        return { start: rangeStart, end: rangeEnd };
    }

    createLocation(item) {
        return new this.vscode.Location(
            this.vscode.Uri.file(this.resolveSourcePath(item.sourcePath)),
            new this.vscode.Range(item.line, item.character, item.line, item.character + (item.length || 0))
        );
    }

    locationPayloadFromItem(item) {
        return {
            sourcePath: item.sourcePath,
            line: item.line,
            character: item.character,
            length: item.length || 0
        };
    }

    locationFromPayload(payload) {
        return this.createLocation(payload);
    }

    async openLocation(location, options = {}) {
        const document = await this.vscode.workspace.openTextDocument(location.uri);
        const editor = await this.vscode.window.showTextDocument(document, {
            viewColumn: options.viewColumn,
            preview: false,
            preserveFocus: false,
            selection: location.range
        });
        editor.selection = new this.vscode.Selection(location.range.start, location.range.end);
        editor.revealRange(location.range, this.vscode.TextEditorRevealType.InCenter);
    }

    uniqueLocations(locations) {
        const seen = new Set();
        const result = [];

        for (const location of locations) {
            const key = this.normalizePath(location.uri.fsPath)
                + ":" + location.range.start.line
                + ":" + location.range.start.character
                + ":" + location.range.end.character;
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            result.push(location);
        }

        return result;
    }

    formatSourceLocation(item) {
        return this.formatDisplayPath(item.sourcePath) + ":" + (item.line + 1);
    }

    formatDisplayPath(sourcePath) {
        const resolvedPath = this.resolveSourcePath(sourcePath);
        const uri = this.vscode.Uri.file(resolvedPath);
        const folder = this.vscode.workspace.getWorkspaceFolder(uri);
        if (!folder) {
            return sourcePath;
        }

        return this.path.relative(folder.uri.fsPath, resolvedPath).replace(/\\/g, "/");
    }

    resolveSourcePath(sourcePath) {
        if (!sourcePath || this.path.isAbsolute(sourcePath)) {
            return sourcePath;
        }

        if (this.vscode.workspace.workspaceFolders && this.vscode.workspace.workspaceFolders.length > 0) {
            return this.path.resolve(this.vscode.workspace.workspaceFolders[0].uri.fsPath, sourcePath);
        }

        return sourcePath;
    }

    clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(value, maximum));
    }
}

module.exports = {
    EditorAuthoringLocationProvider
};
