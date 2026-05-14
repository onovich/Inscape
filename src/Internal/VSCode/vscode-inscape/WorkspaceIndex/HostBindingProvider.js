"use strict";

class HostBindingProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.readProjectConfig = dependencies.readProjectConfig;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.parseCsvRows = dependencies.parseCsvRows;
        this.collectWorkspaceTextSources = dependencies.collectWorkspaceTextSources;
        this.normalizeHostBindingKind = dependencies.normalizeHostBindingKind;
        this.formatDisplayPath = dependencies.formatDisplayPath;
    }

    getBindingCompletionContext(linePrefix) {
        if (/^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*[^\s\]]*$/.test(linePrefix)) {
            return { kind: "timeline" };
        }

        const openBracket = linePrefix.lastIndexOf("[");
        const closeBracket = linePrefix.lastIndexOf("]");
        if (openBracket <= closeBracket) {
            return undefined;
        }

        const body = linePrefix.slice(openBracket + 1);
        const match = /^([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*[^\]]*$/.exec(body);
        return match ? { kind: this.normalizeHostBindingKind(match[1]) } : undefined;
    }

    getBindingAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const metadataMatch = /^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*([^\s\]]+)/.exec(line);
        if (metadataMatch) {
            const alias = metadataMatch[1].trim();
            const bindingStart = line.indexOf("@timeline", metadataMatch.index);
            const bindingEnd = Math.min(line.length, metadataMatch.index + metadataMatch[0].length);
            if (position.character >= bindingStart && position.character <= bindingEnd) {
                return {
                    kind: "timeline",
                    alias,
                    range: new this.vscode.Range(position.line, bindingStart, position.line, bindingEnd)
                };
            }
        }

        const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*([^\]\s]+)\]/g;
        let inlineMatch = inlinePattern.exec(line);
        while (inlineMatch) {
            const kind = this.normalizeHostBindingKind(inlineMatch[1].trim());
            const alias = inlineMatch[2].trim();
            const bindingStart = inlineMatch.index;
            const bindingEnd = inlineMatch.index + inlineMatch[0].length;
            if (position.character >= bindingStart && position.character <= bindingEnd) {
                return {
                    kind,
                    alias,
                    range: new this.vscode.Range(position.line, bindingStart, position.line, bindingEnd)
                };
            }
            inlineMatch = inlinePattern.exec(line);
        }

        return undefined;
    }

    async collectWorkspaceBindings(document, kind) {
        const bindings = [];
        const seen = new Set();

        const configured = await this.readConfiguredBindings(document);
        for (const binding of configured) {
            if (binding.kind === kind) {
                this.addBinding(bindings, seen, binding);
            }
        }

        const sources = await this.collectWorkspaceTextSources(document);
        for (const source of sources) {
            this.collectBindingsFromText(source.text, source.sourcePath, kind, bindings, seen);
        }

        return bindings.sort((left, right) => {
            if (left.sourceRank !== right.sourceRank) {
                return left.sourceRank - right.sourceRank;
            }
            return left.alias.localeCompare(right.alias, "zh-Hans-CN");
        });
    }

    createCompletionItem(binding) {
        const item = new this.vscode.CompletionItem(binding.alias, this.vscode.CompletionItemKind.Reference);
        item.insertText = binding.alias;
        item.detail = this.createDetail(binding);
        item.documentation = this.createMarkdown(binding);
        item.sortText = (binding.sourceRank || 0) + "_" + binding.alias;
        return item;
    }

    createHoverMarkdown(binding) {
        return this.createMarkdown(binding);
    }

    createMissingHoverMarkdown(binding) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Host Binding** `" + binding.kind + ":" + binding.alias + "`\n\n");
        markdown.appendMarkdown("This looks like a host bridge hint, but no mapping row or scanned workspace occurrence was found yet.\n\n");
        markdown.appendMarkdown("Add it to `inscape.config.json` or the binding CSV to make Ctrl+Click resolve it.\n\n");
        markdown.appendMarkdown("Source: `" + this.formatDisplayPath(binding.sourcePath) + "`");
        return markdown;
    }

    async readConfiguredBindings(document) {
        const projectConfig = await this.readProjectConfig(document);
        if (!projectConfig || !projectConfig.configPath || !projectConfig.config || !projectConfig.config.unitySample) {
            return [];
        }

        const bindingMap = projectConfig.config.unitySample.bindingMap;
        if (!bindingMap) {
            return [];
        }

        const bindingMapPath = this.resolveProjectConfigPath(projectConfig.configPath, bindingMap);
        if (!this.fs.existsSync(bindingMapPath)) {
            return [];
        }

        const text = await this.fs.promises.readFile(bindingMapPath, "utf8");
        const sourceLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        const rows = this.parseCsvRows(text).filter((row) => !(row[0] || "").trim().startsWith("#"));
        if (rows.length === 0) {
            return [];
        }

        const headers = rows[0].map((header) => header.trim());
        const hasHeader = headers.includes("kind") && headers.includes("alias");
        const kindIndex = hasHeader ? headers.indexOf("kind") : 0;
        const aliasIndex = hasHeader ? headers.indexOf("alias") : 1;
        const unitySampleIdIndex = hasHeader ? headers.indexOf("unitySampleId") : 2;
        const unityGuidIndex = hasHeader ? headers.indexOf("unityGuid") : 3;
        const addressableKeyIndex = hasHeader ? headers.indexOf("addressableKey") : 4;
        const assetPathIndex = hasHeader ? headers.indexOf("assetPath") : 5;
        const dataRows = hasHeader ? rows.slice(1) : rows;

        return dataRows
            .map((row, index) => {
                const line = hasHeader ? index + 1 : index;
                const lineText = sourceLines[line] || row.join(",");
                const alias = (row[aliasIndex] || "").trim();
                return {
                    kind: (row[kindIndex] || "").trim(),
                    alias,
                    unitySampleId: this.readOptionalCsvField(row, unitySampleIdIndex),
                    unityGuid: this.readOptionalCsvField(row, unityGuidIndex),
                    addressableKey: this.readOptionalCsvField(row, addressableKeyIndex),
                    assetPath: this.readOptionalCsvField(row, assetPathIndex),
                    sourcePath: bindingMapPath,
                    sourceLabel: "UnitySample binding map",
                    sourceRank: 0,
                    line,
                    character: 0,
                    length: Math.max(alias.length, lineText.length)
                };
            })
            .filter((binding) => binding.kind.length > 0 && binding.alias.length > 0);
    }

    readOptionalCsvField(row, index) {
        return index >= 0 && index < row.length ? (row[index] || "").trim() : "";
    }

    collectBindingsFromText(text, sourcePath, requestedKind, bindings, seen) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const line = lines[lineIndex];
            const metadataMatch = /^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*([^\s\]]+)/.exec(line);
            if (requestedKind === "timeline" && metadataMatch) {
                const alias = metadataMatch[1].trim();
                const start = line.indexOf(alias, metadataMatch.index);
                this.addBinding(bindings, seen, {
                    kind: "timeline",
                    alias,
                    unitySampleId: "",
                    unityGuid: "",
                    addressableKey: "",
                    assetPath: "",
                    sourcePath,
                    sourceLabel: "Workspace timeline hook",
                    sourceRank: 1,
                    line: lineIndex,
                    character: Math.max(0, start),
                    length: Math.max(alias.length, 1)
                });
            }

            const inlinePattern = /\[([A-Za-z_][A-Za-z0-9_.-]*)\s*:\s*([^\]\s]+)\]/g;
            let inlineMatch = inlinePattern.exec(line);
            while (inlineMatch) {
                const kind = this.normalizeHostBindingKind(inlineMatch[1].trim());
                const alias = inlineMatch[2].trim();
                if (kind === requestedKind && alias.length > 0) {
                    const aliasStart = inlineMatch.index + inlineMatch[0].lastIndexOf(inlineMatch[2]);
                    this.addBinding(bindings, seen, {
                        kind,
                        alias,
                        unitySampleId: "",
                        unityGuid: "",
                        addressableKey: "",
                        assetPath: "",
                        sourcePath,
                        sourceLabel: "Workspace inline tag",
                        sourceRank: 1,
                        line: lineIndex,
                        character: Math.max(0, aliasStart),
                        length: Math.max(alias.length, 1)
                    });
                }
                inlineMatch = inlinePattern.exec(line);
            }
        }
    }

    addBinding(bindings, seen, binding) {
        const key = binding.kind + "\n" + binding.alias;
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        bindings.push(binding);
    }

    createDetail(binding) {
        const pieces = [binding.kind];
        if (binding.unitySampleId) {
            pieces.push("UnitySample " + binding.unitySampleId);
        }
        if (binding.addressableKey) {
            pieces.push(binding.addressableKey);
        }
        if (pieces.length === 1) {
            pieces.push(binding.sourceLabel + " (unbound)");
        }
        return pieces.join(" / ");
    }

    createMarkdown(binding) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Host Binding** `" + binding.kind + ":" + binding.alias + "`\n\n");
        markdown.appendMarkdown("This is a host bridge hint. Ctrl+Click opens the configured mapping row or the first workspace occurrence.\n\n");
        this.appendField(markdown, "UnitySample id", binding.unitySampleId);
        this.appendField(markdown, "Addressable", binding.addressableKey);
        this.appendField(markdown, "Asset", binding.assetPath);
        this.appendField(markdown, "Unity guid", binding.unityGuid);
        markdown.appendMarkdown("Source: `" + this.formatDisplayPath(binding.sourcePath) + "`");
        return markdown;
    }

    appendField(markdown, label, value) {
        if (!value) {
            return;
        }

        markdown.appendMarkdown(label + ": `" + value + "`\n\n");
    }

}

module.exports = {
    HostBindingProvider
};
