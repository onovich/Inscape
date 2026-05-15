"use strict";

class DslScriptMetadataProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.collectWorkspaceTextSources = dependencies.collectWorkspaceTextSources;
    }

    getDirectiveAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const match = /^\s*@([A-Za-z_][A-Za-z0-9_.-]*)(?:\s+([^\s]+))?/.exec(line);
        if (!match) {
            return undefined;
        }

        const kind = match[1].trim();
        const value = match[2] ? match[2].trim() : "";
        const start = line.indexOf("@" + match[1]);
        const end = line.trimEnd().length;

        if (position.character >= start && position.character <= Math.max(start, end)) {
            return {
                key: kind,
                kind,
                value,
                raw: line.trim(),
                range: new this.vscode.Range(position.line, start, position.line, Math.max(start, end))
            };
        }

        return undefined;
    }

    async collectWorkspaceReferences(document, metadataInfo) {
        const references = [];
        const sources = await this.collectWorkspaceTextSources(document);
        for (const source of sources) {
            this.collectReferencesFromText(source.text, source.sourcePath, metadataInfo, references);
        }
        return references;
    }

    createHoverMarkdown(metadataInfo) {
        const markdown = new this.vscode.MarkdownString(undefined, true);
        markdown.isTrusted = false;
        markdown.appendMarkdown("**Inscape Metadata** `" + metadataInfo.raw + "`\n\n");

        if (metadataInfo.kind === "entry") {
            markdown.appendMarkdown("Marks the entry node for preview / project startup. It does not change dialogue text; it tells the compiler and preview where to begin.\n\n");
        } else if (metadataInfo.kind === "scene") {
            markdown.appendMarkdown("Scene metadata. Use it to label or group a block for host-side logic, asset loading, or authoring conventions.\n\n");
        } else {
            markdown.appendMarkdown("Generic `@` metadata line. Inscape keeps these as lightweight author-intent markers so hosts and adapters can interpret them later.\n\n");
        }

        if (metadataInfo.value) {
            markdown.appendMarkdown("Value: `" + metadataInfo.value + "`\n\n");
        }

        markdown.appendMarkdown("Tip: `@timeline ...` is a host binding hint; `[` `kind: alias` `]` is the inline equivalent.");
        return markdown;
    }

    collectReferencesFromText(text, sourcePath, metadataInfo, references) {
        const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
            const line = lines[lineIndex];
            const match = /^\s*@([A-Za-z_][A-Za-z0-9_.-]*)(?:\s+([^\s]+))?/.exec(line);
            if (!match) {
                continue;
            }

            const kind = match[1].trim();
            const value = match[2] ? match[2].trim() : "";
            const raw = line.trim();
            if (raw !== metadataInfo.raw && (kind !== metadataInfo.kind || value !== metadataInfo.value)) {
                continue;
            }

            const start = line.indexOf("@" + kind);
            references.push({
                key: kind,
                value,
                sourcePath,
                line: lineIndex,
                character: Math.max(0, start),
                length: Math.max(line.trimEnd().length - Math.max(0, start), 1)
            });
        }
    }

}

module.exports = {
    DslScriptMetadataProvider
};
