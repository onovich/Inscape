"use strict";

class DslScriptNodeProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.collectWorkspaceTextSources = dependencies.collectWorkspaceTextSources;
        this.isJumpReferenceLine = dependencies.isJumpReferenceLine;
    }

    getDeclaredNodeAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const match = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/.exec(line);
        if (!match) {
            return undefined;
        }

        const start = line.indexOf(match[1]);
        const end = start + match[1].length;
        if (position.character >= start && position.character <= end) {
            return {
                name: match[1],
                range: new this.vscode.Range(position.line, start, position.line, end)
            };
        }

        return undefined;
    }

    getDeclaredNodeNameAtPosition(document, position) {
        const node = this.getDeclaredNodeAtPosition(document, position);
        return node ? node.name : undefined;
    }

    getJumpTargetAtPosition(document, position) {
        const target = this.getJumpTargetInfoAtPosition(document, position);
        return target ? target.name : undefined;
    }

    getJumpTargetInfoAtPosition(document, position) {
        const line = document.lineAt(position).text;
        if (!this.isJumpReferenceLine(line)) {
            return undefined;
        }

        const jumpPattern = /->\s*([A-Za-z0-9_.-]*)/g;
        let match = jumpPattern.exec(line);

        while (match) {
            const target = match[1];
            const targetStart = match.index + match[0].length - target.length;
            const targetEnd = targetStart + target.length;
            if (position.character >= targetStart && position.character <= targetEnd) {
                return target.length > 0
                    ? {
                        name: target,
                        range: new this.vscode.Range(position.line, targetStart, position.line, targetEnd)
                    }
                    : undefined;
            }
            match = jumpPattern.exec(line);
        }

        return undefined;
    }

    async collectWorkspaceNodes(document) {
        const nodes = [];
        const seen = new Set();
        const sources = await this.collectWorkspaceTextSources(document);

        for (const source of sources) {
            this.collectNodesFromText(source.text, source.sourcePath, seen, nodes);
        }

        return nodes.sort((left, right) => left.name.localeCompare(right.name));
    }

    collectDocumentNodes(document) {
        const nodes = [];
        this.collectNodesFromText(document.getText(), document.uri.fsPath, new Set(), nodes);
        return nodes;
    }

    async collectWorkspaceNavigation(document) {
        const declarations = [];
        const declarationSeen = new Set();
        const referencesByTarget = new Map();
        const sources = await this.collectWorkspaceTextSources(document);

        for (const source of sources) {
            this.collectNodesFromText(source.text, source.sourcePath, declarationSeen, declarations);
            this.collectNavigationFromText(source.text, source.sourcePath, referencesByTarget);
        }

        return {
            declarations,
            referencesByTarget
        };
    }

    async collectWorkspaceJumpReferences(document, targetName) {
        const references = [];
        const sources = await this.collectWorkspaceTextSources(document);

        for (const source of sources) {
            this.collectJumpReferencesFromText(source.text, source.sourcePath, targetName, references);
        }

        return references.sort((left, right) => {
            const pathCompare = left.sourcePath.localeCompare(right.sourcePath);
            if (pathCompare !== 0) {
                return pathCompare;
            }
            if (left.line !== right.line) {
                return left.line - right.line;
            }
            return left.character - right.character;
        });
    }

    collectNodesFromText(text, sourcePath, seen, nodes) {
        const pattern = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/;
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            const match = pattern.exec(lines[line]);
            if (match && !seen.has(match[1])) {
                seen.add(match[1]);
                nodes.push({
                    name: match[1],
                    sourcePath,
                    line,
                    character: Math.max(0, lines[line].indexOf(match[1])),
                    length: match[1].length
                });
            }
        }
    }

    collectNavigationFromText(text, sourcePath, referencesByTarget) {
        const jumpPattern = /->\s*([A-Za-z0-9_.-]+)/g;
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            if (!this.isJumpReferenceLine(lines[line])) {
                continue;
            }

            jumpPattern.lastIndex = 0;
            let jumpMatch = jumpPattern.exec(lines[line]);
            while (jumpMatch) {
                const target = jumpMatch[1];
                const character = jumpMatch.index + jumpMatch[0].length - target.length;
                this.addToMapList(referencesByTarget, target, {
                    name: target,
                    target,
                    sourcePath,
                    line,
                    character,
                    length: target.length
                });

                jumpMatch = jumpPattern.exec(lines[line]);
            }
        }
    }

    collectJumpReferencesFromText(text, sourcePath, targetName, references) {
        const pattern = /->\s*([A-Za-z0-9_.-]+)/g;
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            if (!this.isJumpReferenceLine(lines[line])) {
                continue;
            }

            pattern.lastIndex = 0;
            let match = pattern.exec(lines[line]);
            while (match) {
                const target = match[1];
                if (target === targetName) {
                    const character = match.index + match[0].length - target.length;
                    references.push({
                        name: target,
                        target,
                        sourcePath,
                        line,
                        character,
                        length: target.length
                    });
                }
                match = pattern.exec(lines[line]);
            }
        }
    }

    addToMapList(map, key, value) {
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(value);
    }

    createDeclarationHoverMarkdown(nodeName) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Dialogue Block** `" + nodeName + "`\n\n");
        markdown.appendMarkdown("A named dialogue block. Its CodeLens shows incoming references.");
        return markdown;
    }

    createJumpTargetHoverMarkdown(nodeName) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Dialogue Block Reference** `" + nodeName + "`\n\n");
        markdown.appendMarkdown("Ctrl+Click to jump to this dialogue block.");
        return markdown;
    }

}

module.exports = {
    DslScriptNodeProvider
};
