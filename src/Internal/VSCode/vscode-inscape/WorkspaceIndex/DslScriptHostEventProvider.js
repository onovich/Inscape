"use strict";

class DslScriptHostEventProvider {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.readProjectConfig = dependencies.readProjectConfig;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.formatDisplayPath = dependencies.formatDisplayPath;
    }

    getEventCompletionContext(linePrefix) {
        const match = /^(\s*@emit(?::|\s+)\s*)([A-Za-z_][A-Za-z0-9_.-]*)?$/.exec(linePrefix);
        if (!match) {
            return undefined;
        }

        const prefix = match[2] || "";
        return {
            prefix,
            startCharacter: match[1].length,
            endCharacter: linePrefix.length
        };
    }

    getEventAtPosition(document, position) {
        const line = document.lineAt(position).text;
        const match = /^(\s*@emit(?::|\s+)\s*)([A-Za-z_][A-Za-z0-9_.-]*)/.exec(line);
        if (!match) {
            return undefined;
        }

        const eventName = match[2].trim();
        const start = match[1].length;
        const end = start + eventName.length;
        if (position.character < start || position.character > end) {
            return undefined;
        }

        return {
            name: eventName,
            kind: "host-event",
            sourcePath: document.uri.fsPath,
            range: new this.vscode.Range(position.line, start, position.line, end)
        };
    }

    async collectSchemaEvents(document) {
        const schemaInfo = await this.readConfiguredSchema(document);
        if (!schemaInfo || !schemaInfo.schema || !Array.isArray(schemaInfo.schema.events)) {
            return [];
        }

        const events = [];
        const seen = new Set();
        for (const hostEvent of schemaInfo.schema.events) {
            if (!hostEvent || typeof hostEvent.name !== "string") {
                continue;
            }

            const name = hostEvent.name.trim();
            if (!this.isEventName(name) || seen.has(name)) {
                continue;
            }

            seen.add(name);
            const location = this.findEventLocation(schemaInfo, name);
            events.push({
                name,
                delivery: typeof hostEvent.delivery === "string" ? hostEvent.delivery : "fire-and-forget",
                sideEffects: hostEvent.sideEffects !== false,
                description: typeof hostEvent.description === "string" ? hostEvent.description : "",
                parameters: Array.isArray(hostEvent.parameters) ? hostEvent.parameters : [],
                sourcePath: schemaInfo.schemaPath,
                sourceLabel: "Host Schema",
                sourceKind: "hostSchema",
                line: location.line,
                character: location.character,
                length: location.length
            });
        }

        return events.sort((left, right) => left.name.localeCompare(right.name));
    }

    createCompletionItem(hostEvent) {
        const item = new this.vscode.CompletionItem(hostEvent.name, this.vscode.CompletionItemKind.Event);
        item.insertText = hostEvent.name;
        item.detail = this.createDetail(hostEvent);
        item.documentation = this.createHoverMarkdown(hostEvent);
        item.sortText = "0_" + hostEvent.name;
        return item;
    }

    createHoverMarkdown(hostEvent) {
        const markdown = new this.vscode.MarkdownString();
        markdown.appendMarkdown("**Inscape host event** `" + hostEvent.name + "`\n\n");
        markdown.appendMarkdown("`@emit` records a host event intent. Host Schema provides this authoring hint; Compiler behavior is unchanged.\n\n");
        this.appendField(markdown, "Delivery", hostEvent.delivery || "fire-and-forget");
        this.appendField(markdown, "Side effects", hostEvent.sideEffects === false ? "no" : "yes");
        const parameterText = this.formatParameters(hostEvent.parameters);
        if (parameterText) {
            this.appendField(markdown, "Parameters", parameterText);
        }

        if (hostEvent.description) {
            this.appendField(markdown, "Description", hostEvent.description);
        }

        this.appendField(markdown, "Source", this.createSourceDetail(hostEvent));
        return markdown;
    }

    createUnknownHoverMarkdown(eventInfo) {
        const markdown = new this.vscode.MarkdownString();
        markdown.appendMarkdown("**Unknown Inscape host event** `" + eventInfo.name + "`\n\n");
        markdown.appendMarkdown("No event with this name was found in the configured Host Schema. This is an authoring hint, not a Compiler error.\n\n");
        markdown.appendMarkdown("Use `@emit` for event / action intent. Use `[]` only for read-only query interpolation.");
        return markdown;
    }

    async readConfiguredSchema(document) {
        const projectConfig = await this.readProjectConfig(document);
        if (!projectConfig || !projectConfig.configPath || !projectConfig.config) {
            return undefined;
        }

        const configuredPath = projectConfig.config.hostSchema;
        if (!configuredPath) {
            return undefined;
        }

        const schemaPath = this.resolveProjectConfigPath(projectConfig.configPath, configuredPath);
        if (!this.fs.existsSync(schemaPath)) {
            return undefined;
        }

        try {
            const text = await this.fs.promises.readFile(schemaPath, "utf8");
            return {
                schemaPath,
                text,
                schema: JSON.parse(text)
            };
        } catch {
            return undefined;
        }
    }

    findEventLocation(schemaInfo, eventName) {
        const lines = schemaInfo.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        let inEvents = false;

        for (let line = 0; line < lines.length; line += 1) {
            if (!inEvents && /"events"\s*:/.test(lines[line])) {
                inEvents = true;
                continue;
            }

            if (inEvents && /"queries"\s*:/.test(lines[line])) {
                break;
            }

            if (!inEvents) {
                continue;
            }

            const nameIndex = lines[line].indexOf("\"name\"");
            if (nameIndex < 0) {
                continue;
            }

            const valueIndex = lines[line].indexOf("\"" + eventName + "\"", nameIndex);
            if (valueIndex >= 0) {
                return {
                    line,
                    character: valueIndex + 1,
                    length: eventName.length
                };
            }
        }

        return {
            line: 0,
            character: 0,
            length: Math.max(eventName.length, 1)
        };
    }

    isEventName(value) {
        return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value);
    }

    formatParameters(parameters) {
        if (!Array.isArray(parameters) || parameters.length === 0) {
            return "";
        }

        return parameters.map((parameter) => {
            const name = parameter && parameter.name ? parameter.name : "?";
            const type = parameter && parameter.type ? parameter.type : "unknown";
            const optional = parameter && parameter.required === false ? "?" : "";
            return name + optional + ": " + type;
        }).join(", ");
    }

    createSourceDetail(hostEvent) {
        return this.formatDisplayPath
            ? this.formatDisplayPath(hostEvent.sourcePath)
            : hostEvent.sourcePath;
    }

    createDetail(hostEvent) {
        const parts = ["host event"];
        if (hostEvent.delivery) {
            parts.push(hostEvent.delivery);
        }

        parts.push(hostEvent.sourceLabel || "Host Schema");
        return parts.join(" - ");
    }

    appendField(markdown, label, value) {
        markdown.appendMarkdown("- **" + label + ":** " + String(value) + "\n");
    }

}

module.exports = {
    DslScriptHostEventProvider
};
