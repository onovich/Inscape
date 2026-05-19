"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");

const sourceFiles = [
    "ExtensionManifestEntry.js",
    "Scripts/Entries/ExtensionRegistrationController.js",
    "Scripts/DslScript/Providers/DslScriptDefinitionProvider.js",
    "Scripts/Preview/Bridges/PreviewRevealBridge.js"
];

function read(relativePath) {
    return fs.readFileSync(path.join(packageRoot, relativePath), "utf8");
}

function assertIncludes(content, expected, message) {
    if (!content.includes(expected)) {
        throw new Error(message);
    }
}

function assertExcludes(content, forbidden, message) {
    if (content.includes(forbidden)) {
        throw new Error(message);
    }
}

function main() {
    const combinedSource = sourceFiles.map(read).join("\n");
    assertExcludes(
        combinedSource,
        "registerDocument" + "LinkProvider",
        "Preview text navigation must not use DocumentLinkProvider; keep DefinitionProvider + selection bridge."
    );

    const registration = read("Scripts/Entries/ExtensionRegistrationController.js");
    assertIncludes(
        registration,
        "registerDefinitionProvider(this.languageSelector, this.dslScriptDefinitionProvider)",
        "DslScriptDefinitionProvider must stay registered for transient Ctrl+hover link affordance."
    );
    assertIncludes(
        registration,
        "onDidChangeTextEditorSelection((event) => this.previewRevealBridge.handleSelectionChange(context, event))",
        "PreviewRevealBridge must stay connected to selection changes."
    );

    const definitionProvider = read("Scripts/DslScript/Providers/DslScriptDefinitionProvider.js");
    assertIncludes(
        definitionProvider,
        "this.previewRevealBridge.rememberDefinition(document, previewRevealInfo)",
        "Definition provider must remember preview reveal payloads before returning the definition link."
    );
    assertIncludes(
        definitionProvider,
        "this.previewRevealBridge.createDefinitionLink(document, previewRevealInfo)",
        "Definition provider must return a precise definition link produced by PreviewRevealBridge."
    );

    const revealBridge = read("Scripts/Preview/Bridges/PreviewRevealBridge.js");
    assertIncludes(
        revealBridge,
        "async handleSelectionChange(context, event)",
        "PreviewRevealBridge must own selection-change handling."
    );
    assertIncludes(
        revealBridge,
        "await this.reveal(context, pending.payload)",
        "Selection bridge must turn accepted Ctrl+Click selections into preview reveal calls."
    );

    console.log("preview navigation contract ok");
}

main();
