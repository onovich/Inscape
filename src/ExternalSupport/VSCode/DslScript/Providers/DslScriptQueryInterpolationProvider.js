"use strict";

class DslScriptQueryInterpolationProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.formatDisplayPath = dependencies.formatDisplayPath;
        this.hostSchemaCapabilityProvider = dependencies.hostSchemaCapabilityProvider;
    }

    getCompletionContext(linePrefix) {
        const openBracket = linePrefix.lastIndexOf("[");
        const closeBracket = linePrefix.lastIndexOf("]");
        if (openBracket <= closeBracket) {
            return undefined;
        }

        const body = linePrefix.slice(openBracket + 1);
        if (body.includes(":") || body.includes("]")) {
            return undefined;
        }

        if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(body) && body.length > 0) {
            return undefined;
        }

        return {
            prefix: body,
            startCharacter: openBracket + 1,
            endCharacter: linePrefix.length
        };
    }

    getInterpolationAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const pattern = /\[([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\]/g;
        let match = pattern.exec(line);
        while (match) {
            const start = match.index;
            const end = match.index + match[0].length;
            if (position.character >= start && position.character <= end) {
                return {
                    raw: match[0],
                    query: match[1],
                    kind: "query-interpolation",
                    sourcePath: document.uri.fsPath,
                    range: new this.vscode.Range(position.line, start, position.line, end)
                };
            }

            match = pattern.exec(line);
        }

        return undefined;
    }

    async collectSchemaQueries(document) {
        const catalogQueries = await this.collectCatalogQueries(document);
        if (catalogQueries) {
            return catalogQueries;
        }

        return [];
    }

    async collectCatalogQueries(document) {
        if (!this.hostSchemaCapabilityProvider) {
            return undefined;
        }

        const catalog = await this.hostSchemaCapabilityProvider.collectCapabilityCatalog(document);
        if (!catalog || !catalog.hostSchema || catalog.hostSchema.loaded !== true || !Array.isArray(catalog.queries)) {
            return undefined;
        }

        const queries = [];
        for (const query of catalog.queries) {
            if (!query || typeof query.name !== "string" || !this.isTextInterpolationQuery(query)) {
                continue;
            }

            queries.push({
                name: query.name.trim(),
                returnType: typeof query.returnType === "string" ? query.returnType : "",
                isAsync: query.isAsync === true,
                description: typeof query.description === "string" ? query.description : "",
                parameters: Array.isArray(query.parameters) ? query.parameters : [],
                sourcePath: typeof query.sourcePath === "string" ? query.sourcePath : "",
                sourceLabel: "Host Schema",
                sourceKind: "hostSchemaCapabilityEndpoint",
                line: Math.max(0, (query.line || 1) - 1),
                character: Math.max(0, (query.column || 1) - 1),
                length: Math.max(query.length || query.name.length, 1)
            });
        }

        return queries.sort((left, right) => left.name.localeCompare(right.name));
    }

    createCompletionItem(query) {
        const item = new this.vscode.CompletionItem(query.name, this.vscode.CompletionItemKind.Value);
        item.insertText = query.name;
        item.detail = this.createDetail(query);
        item.documentation = this.createHoverMarkdown(query);
        item.sortText = "0_" + query.name;
        return item;
    }

    createHoverMarkdown(query) {
        const markdown = new this.vscode.MarkdownString();
        markdown.appendMarkdown("**Inscape query interpolation** `" + query.name + "`\n\n");
        markdown.appendMarkdown("`[]` reads a value for text interpolation. Host Schema provides this authoring hint; Compiler behavior is unchanged.\n\n");
        this.appendField(markdown, "Return type", query.returnType || "unspecified");
        this.appendField(markdown, "Async", query.isAsync ? "yes" : "no");
        if (query.description) {
            this.appendField(markdown, "Description", query.description);
        }

        this.appendField(markdown, "Source", this.createSourceDetail(query));
        return markdown;
    }

    createUnknownHoverMarkdown(interpolation) {
        const markdown = new this.vscode.MarkdownString();
        markdown.appendMarkdown("**Unknown Inscape query interpolation** `" + interpolation.query + "`\n\n");
        markdown.appendMarkdown("No zero-parameter simple query with this name was found in the configured Host Schema. This is an authoring hint, not a Compiler error.\n\n");
        markdown.appendMarkdown("Use `[]` for read-only text interpolation. Keep events, actions, timing hooks, and host binding out of `[]` usage.");
        return markdown;
    }

    isSimpleQueryPath(value) {
        return /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value.trim());
    }

    isTextInterpolationQuery(query) {
        return this.isSimpleQueryPath(query.name)
            && (!Array.isArray(query.parameters) || query.parameters.length === 0);
    }

    createSourceDetail(query) {
        return this.formatDisplayPath
            ? this.formatDisplayPath(query.sourcePath)
            : query.sourcePath;
    }

    createDetail(query) {
        const parts = [];
        if (query.returnType) {
            parts.push(query.returnType);
        }

        parts.push(query.isAsync ? "async query" : "query");
        parts.push(query.sourceLabel || "Host Schema");
        return parts.join(" - ");
    }

    appendField(markdown, label, value) {
        markdown.appendMarkdown("- **" + label + ":** " + String(value) + "\n");
    }

}

module.exports = {
    DslScriptQueryInterpolationProvider
};
