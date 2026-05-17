"use strict";

class DslScriptNodeProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.collectWorkspaceTextSources = dependencies.collectWorkspaceTextSources;
        this.isJumpReferenceLine = dependencies.isJumpReferenceLine;
    }

    getDeclaredNodeAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const declaration = this.parseDeclaredNodeLine(line);
        if (!declaration) {
            return undefined;
        }

        const start = declaration.character;
        const end = start + declaration.name.length;
        if (position.character >= start && position.character <= end) {
            return {
                name: declaration.name,
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

        for (const targetInfo of this.collectJumpTargetsFromLine(line)) {
            const target = targetInfo.name;
            const targetStart = targetInfo.character;
            const targetEnd = targetStart + target.length;
            if (position.character >= targetStart && position.character <= targetEnd) {
                return target.length > 0
                    ? {
                        name: target,
                        range: new this.vscode.Range(position.line, targetStart, position.line, targetEnd)
                    }
                    : undefined;
            }
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
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            const declaration = this.parseDeclaredNodeLine(lines[line]);
            if (declaration && !seen.has(declaration.name)) {
                seen.add(declaration.name);
                nodes.push({
                    name: declaration.name,
                    syntaxKind: declaration.syntaxKind,
                    sourcePath,
                    line,
                    character: declaration.character,
                    length: declaration.name.length
                });
            }
        }
    }

    collectNavigationFromText(text, sourcePath, referencesByTarget) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            if (!this.isJumpReferenceLine(lines[line])) {
                continue;
            }

            for (const jumpTarget of this.collectJumpTargetsFromLine(lines[line])) {
                const target = jumpTarget.name;
                this.addToMapList(referencesByTarget, target, {
                    name: target,
                    target,
                    sourcePath,
                    line,
                    character: jumpTarget.character,
                    length: target.length
                });
            }
        }
    }

    collectJumpReferencesFromText(text, sourcePath, targetName, references) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

        for (let line = 0; line < lines.length; line += 1) {
            if (!this.isJumpReferenceLine(lines[line])) {
                continue;
            }

            for (const jumpTarget of this.collectJumpTargetsFromLine(lines[line])) {
                const target = jumpTarget.name;
                if (target === targetName) {
                    references.push({
                        name: target,
                        target,
                        sourcePath,
                        line,
                        character: jumpTarget.character,
                        length: target.length
                    });
                }
            }
        }
    }

    parseDeclaredNodeLine(line) {
        const legacyMatch = /^\s*::\s+([a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*)\s*$/.exec(line);
        if (legacyMatch) {
            return {
                name: legacyMatch[1],
                syntaxKind: "legacyNodeName",
                character: Math.max(0, line.indexOf(legacyMatch[1]))
            };
        }

        const hashIndex = line.indexOf("#");
        if (hashIndex < 0 || line.slice(0, hashIndex).trim().length > 0) {
            return undefined;
        }

        const rawTitle = line.slice(hashIndex + 1);
        const title = rawTitle.trim();
        if (!this.isValidTitle(title)) {
            return undefined;
        }

        return {
            name: title,
            syntaxKind: "title",
            character: hashIndex + 1 + rawTitle.indexOf(title)
        };
    }

    collectJumpTargetsFromLine(line) {
        const targets = [];
        const pattern = /->\s*/g;
        let match = pattern.exec(line);

        while (match) {
            const rawTarget = line.slice(match.index + match[0].length);
            const target = rawTarget.trim();
            if (this.isValidJumpTarget(target)) {
                targets.push({
                    name: target,
                    character: match.index + match[0].length + rawTarget.indexOf(target)
                });
            }
            match = pattern.exec(line);
        }

        return targets;
    }

    isValidJumpTarget(target) {
        return /^[a-z][a-z0-9_-]*(?:\.[a-z][a-z0-9_-]*)*$/.test(target)
            || this.isValidTitle(target);
    }

    isValidTitle(title) {
        return title.length > 0
            && !title.includes("->")
            && !title.includes("/")
            && !title.includes("\\")
            && !/[\u0000-\u001f\u007f]/.test(title);
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
