"use strict";

class HostSchemaCommand {

    constructor(dependencies) {
        this.vscode = dependencies.vscode;
        this.selectWorkspaceFolder = dependencies.selectWorkspaceFolder;
        this.hostSchemaCapabilityProvider = dependencies.hostSchemaCapabilityProvider;
        this.openLocation = dependencies.openLocation;
        this.locationFromPayload = dependencies.locationFromPayload;
    }

    async showCapabilities() {
        const workspaceFolder = await this.selectWorkspaceFolder();
        if (!workspaceFolder) {
            return;
        }

        let catalog;
        try {
            catalog = await this.hostSchemaCapabilityProvider.collectCapabilityCatalogForWorkspace(workspaceFolder);
        } catch (error) {
            this.vscode.window.showErrorMessage(error.message || String(error));
            return;
        }

        if (!catalog || !catalog.hostSchema || !catalog.hostSchema.loaded) {
            const message = catalog?.hostSchema?.errorMessage || "Configure hostSchema in inscape.config.json before listing host capabilities.";
            this.vscode.window.showWarningMessage(message);
            return;
        }

        const items = this.createQuickPickItems(catalog);
        if (items.length === 0) {
            this.vscode.window.showInformationMessage("Host schema has no queries, actions, or legacy events.");
            return;
        }

        const selected = await this.vscode.window.showQuickPick(items, {
            placeHolder: "Select an Inscape host query, action, or legacy event"
        });
        if (!selected || !selected.location) {
            return;
        }

        await this.openLocation(this.locationFromPayload(selected.location));
    }

    createQuickPickItems(catalog) {
        const items = [];
        const queries = Array.isArray(catalog.queries) ? catalog.queries : [];
        const actions = Array.isArray(catalog.actions) ? catalog.actions : [];
        const events = Array.isArray(catalog.events) ? catalog.events : [];

        for (const query of queries) {
            if (!query || !query.name) {
                continue;
            }

            items.push({
                label: query.name,
                description: "query -> " + (query.returnType || "unknown"),
                detail: this.formatParameters(query.parameters) + this.formatDescription(query.description),
                location: this.createLocationPayload(query)
            });
        }

        for (const action of actions) {
            if (!action || !action.name) {
                continue;
            }

            items.push({
                label: action.name,
                description: "action / " + (action.mode || "fire"),
                detail: this.formatParameters(action.parameters) + this.formatDescription(action.description),
                location: this.createLocationPayload(action)
            });
        }

        for (const event of events) {
            if (!event || !event.name) {
                continue;
            }

            items.push({
                label: event.name,
                description: "legacy event / " + (event.delivery || "fire-and-forget"),
                detail: this.formatParameters(event.parameters) + this.formatDescription(event.description),
                location: this.createLocationPayload(event)
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

    createLocationPayload(capability) {
        return {
            sourcePath: capability.sourcePath || "",
            line: Math.max(Number(capability.line || 1) - 1, 0),
            character: Math.max(Number(capability.column || 1) - 1, 0),
            length: Math.max(Number(capability.length || capability.name?.length || 1), 1)
        };
    }

}

module.exports = {
    HostSchemaCommand
};
