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

        return undefined;
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
        markdown.appendMarkdown("This looks like a host bridge reference, but no mapping row or scanned workspace occurrence was found yet. `@timeline...` uses this as a host event / timing hook.\n\n");
        markdown.appendMarkdown("Add it to `inscape.config.json` or the binding CSV to make Ctrl+Click resolve it.\n\n");
        markdown.appendMarkdown("Source: `" + this.formatDisplayPath(binding.sourcePath) + "`");
        return markdown;
    }

    async readConfiguredBindings(document) {
        const hostBridgeBindings = await this.readConfiguredHostBridgeBindings(document);
        const legacyBindings = await this.readConfiguredLegacyBindings(document);
        return hostBridgeBindings.concat(legacyBindings);
    }

    async readConfiguredHostBridgeBindings(document) {
        const hostBridgePath = await this.getConfiguredHostBridgePath(document);
        if (!hostBridgePath) {
            return [];
        }

        const text = await this.fs.promises.readFile(hostBridgePath, "utf8");
        let bridge;
        try {
            bridge = JSON.parse(text);
        } catch {
            return [];
        }

        if (!bridge || !Array.isArray(bridge.ids)) {
            return [];
        }

        return bridge.ids
            .filter((entry) => entry && typeof entry.kind === "string" && typeof entry.name === "string" && entry.kind !== "speaker")
            .map((entry) => {
                const host = entry.host || {};
                const assetId = host.assetId !== undefined && host.assetId !== null ? String(host.assetId) : "";
                const alias = entry.name.trim();
                return {
                    kind: this.normalizeHostBindingKind(entry.kind),
                    name: alias,
                    alias,
                    assetId,
                    unitySampleId: "",
                    unityGuid: typeof host.unityGuid === "string" ? host.unityGuid : "",
                    addressableKey: typeof host.addressableKey === "string" ? host.addressableKey : "",
                    assetPath: typeof host.assetPath === "string" ? host.assetPath : "",
                    sourcePath: hostBridgePath,
                    sourceLabel: "Host Bridge",
                    sourceKind: "hostBridge",
                    sourceRank: 0,
                    line: 0,
                    character: 0,
                    length: Math.max(alias.length, 1)
                };
            })
            .filter((binding) => binding.kind.length > 0 && binding.alias.length > 0);
    }

    async getConfiguredHostBridgePath(document) {
        const projectConfig = await this.readProjectConfig(document);
        if (!projectConfig || !projectConfig.configPath || !projectConfig.config) {
            return undefined;
        }

        const hostBridge = projectConfig.config.hostBridge;
        if (!hostBridge) {
            return undefined;
        }

        const hostBridgePath = this.resolveProjectConfigPath(projectConfig.configPath, hostBridge);
        if (!this.fs.existsSync(hostBridgePath)) {
            return undefined;
        }

        return hostBridgePath;
    }

    async readConfiguredLegacyBindings(document) {
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
                    name: alias,
                    alias,
                    assetId: "",
                    unitySampleId: this.readOptionalCsvField(row, unitySampleIdIndex),
                    unityGuid: this.readOptionalCsvField(row, unityGuidIndex),
                    addressableKey: this.readOptionalCsvField(row, addressableKeyIndex),
                    assetPath: this.readOptionalCsvField(row, assetPathIndex),
                    sourcePath: bindingMapPath,
                    sourceLabel: "Legacy UnitySample binding map",
                    sourceKind: "legacyBindingMap",
                    sourceRank: 1,
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
                    name: alias,
                    alias,
                    assetId: "",
                    unitySampleId: "",
                    unityGuid: "",
                    addressableKey: "",
                    assetPath: "",
                    sourcePath,
                    sourceLabel: "Workspace timeline hook",
                    sourceKind: "script",
                    sourceRank: 1,
                    line: lineIndex,
                    character: Math.max(0, start),
                    length: Math.max(alias.length, 1)
                });
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
        if (binding.assetId) {
            pieces.push("Host asset " + binding.assetId);
        }
        if (binding.unitySampleId) {
            pieces.push("legacy UnitySample " + binding.unitySampleId);
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
        markdown.appendMarkdown("This resolves through Host Bridge or legacy binding data. `@timeline...` uses this as a host event / timing hook. Ctrl+Click opens the configured mapping row or the first workspace occurrence.\n\n");
        this.appendField(markdown, "Host asset id", binding.assetId);
        this.appendField(markdown, "Legacy UnitySample id", binding.unitySampleId);
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
