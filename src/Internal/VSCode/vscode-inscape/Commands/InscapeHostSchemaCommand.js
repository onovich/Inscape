"use strict";

class InscapeHostSchemaCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.fs = dependencies.fs;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.readProjectConfigFromWorkspaceFolder = dependencies.readProjectConfigFromWorkspaceFolder;
        this.resolveProjectConfigPath = dependencies.resolveProjectConfigPath;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
        this.escapeRegExp = dependencies.escapeRegExp;
    }

    async showCapabilities() {
        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        let schema;
        try {
            schema = await this.readConfiguredSchema(workspaceFolder);
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
            return;
        }

        if (!schema) {
            this.vscode.window.showWarningMessage("Configure hostSchema in inscape.config.json before listing host capabilities.");
            return;
        }

        const items = this.createQuickPickItems(schema);
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Host schema has no queries or events.");
            return;
        }

        const selected = await this.vscode.window.showQuickPick(items, {
            placeHolder: "Select an Inscape host query or event"
        });
        if (!selected || !selected.location) {
            return;
        }

        await this.openLocation(this.locationFromPayload(selected.location));
    }

    async readConfiguredSchema(workspaceFolder) {
        const projectConfig = await this.readProjectConfigFromWorkspaceFolder(workspaceFolder);
        if (!projectConfig || !projectConfig.configPath || !projectConfig.config) {
            return undefined;
        }

        const configuredPath = projectConfig.config.hostSchema;
        if (!configuredPath) {
            return undefined;
        }

        const schemaPath = this.resolveProjectConfigPath(projectConfig.configPath, configuredPath);
        if (!this.fs.existsSync(schemaPath)) {
            throw new Error("Host schema not found: " + schemaPath);
        }

        const text = await this.fs.promises.readFile(schemaPath, "utf8");
        return {
            schemaPath,
            text,
            schema: JSON.parse(text)
        };
    }

    createQuickPickItems(schemaInfo) {
        const items = [];
        const queries = Array.isArray(schemaInfo.schema.queries) ? schemaInfo.schema.queries : [];
        const events = Array.isArray(schemaInfo.schema.events) ? schemaInfo.schema.events : [];

        for (const query of queries) {
            if (!query || !query.name) {
                continue;
            }

            items.push({
                label: query.name,
                description: "query -> " + (query.returnType || "unknown"),
                detail: this.formatParameters(query.parameters) + this.formatDescription(query.description),
                location: this.findCapabilityLocation(schemaInfo, "queries", query.name)
            });
        }

        for (const event of events) {
            if (!event || !event.name) {
                continue;
            }

            items.push({
                label: event.name,
                description: "event / " + (event.delivery || "fire-and-forget"),
                detail: this.formatParameters(event.parameters) + this.formatDescription(event.description),
                location: this.findCapabilityLocation(schemaInfo, "events", event.name)
            });
        }

        return items.sort((left, right) => {
            const descriptionCompare = left.description.localeCompare(right.description);
            return descriptionCompare !== 0 ? descriptionCompare : left.label.localeCompare(right.label);
        });
    }

    formatParameters(parameters) {
        if (!Array.isArray(parameters) || parameters.length === 0) {
            return "()";
        }

        return "(" + parameters.map((parameter) => {
            const name = parameter && parameter.name ? parameter.name : "?";
            const type = parameter && parameter.type ? parameter.type : "unknown";
            const optional = parameter && parameter.required === false ? "?" : "";
            return name + optional + ": " + type;
        }).join(", ") + ")";
    }

    formatDescription(description) {
        return description ? " - " + description : "";
    }

    findCapabilityLocation(schemaInfo, sectionName, capabilityName) {
        const lines = schemaInfo.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        const sectionPattern = new RegExp("\"" + this.escapeRegExp(sectionName) + "\"\\s*:");
        const nextSectionPattern = sectionName === "queries"
            ? /"events"\s*:/
            : /"queries"\s*:/;
        let inSection = false;

        for (let line = 0; line < lines.length; line += 1) {
            if (!inSection && sectionPattern.test(lines[line])) {
                inSection = true;
                continue;
            }

            if (inSection && nextSectionPattern.test(lines[line])) {
                break;
            }

            if (!inSection) {
                continue;
            }

            const nameIndex = lines[line].indexOf("\"name\"");
            if (nameIndex < 0) {
                continue;
            }

            const valueIndex = lines[line].indexOf("\"" + capabilityName + "\"", nameIndex);
            if (valueIndex >= 0) {
                return {
                    sourcePath: schemaInfo.schemaPath,
                    line,
                    character: valueIndex + 1,
                    length: capabilityName.length
                };
            }
        }

        return {
            sourcePath: schemaInfo.schemaPath,
            line: 0,
            character: 0,
            length: 0
        };
    }

}

module.exports = {
    InscapeHostSchemaCommand
};
