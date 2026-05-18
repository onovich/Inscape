"use strict";

const path = require("path");
const { PreviewRevealBridge } = require(path.join("..", "Preview", "Bridges", "PreviewRevealBridge"));

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function createDocument(filePath) {
    return {
        uri: { fsPath: filePath }
    };
}

function createSelection(line, startCharacter, endCharacter) {
    return {
        start: { line, character: startCharacter },
        end: { line, character: endCharacter },
        active: { line, character: endCharacter }
    };
}

function createEvent(document, selection, kind) {
    return {
        textEditor: { document },
        selections: [selection],
        kind
    };
}

function createBridge(mode, options = {}) {
    const openDocumentCalls = [];
    const executeCommandCalls = [];
    const errorMessages = [];
    const postedMessages = [];
    const panel = {
        webview: {
            postMessage(message) {
                postedMessages.push(message);
            }
        }
    };

    const previewPanels = new Map();
    if (options.withOpenPanel) {
        previewPanels.set("d:/labprojects/inscape/samples/court-loop.inscape", new Set([panel]));
    }

    const bridge = new PreviewRevealBridge({
        vscode: {
            TextEditorSelectionChangeKind: {
                Keyboard: 1
            },
            workspace: {
                async openTextDocument(uri) {
                    openDocumentCalls.push(uri.fsPath);
                    return createDocument(uri.fsPath);
                }
            },
            Uri: {
                file(filePath) {
                    return { fsPath: filePath };
                }
            },
            commands: {
                async executeCommand(command, uri, viewType) {
                    executeCommandCalls.push({ command, path: uri.fsPath, viewType });
                }
            },
            window: {
                showErrorMessage(message) {
                    errorMessages.push(message);
                }
            },
            ViewColumn: {
                Beside: 2
            }
        },
        previewPanels,
        refreshPreviewPanel: async () => { },
        isInscapeDocument: () => true,
        normalizePath: (value) => String(value || "").replace(/\\/g, "/").toLowerCase(),
        isLikelyDialogueSpeaker: () => true,
        findDialogueSeparatorIndex: (line) => line.indexOf(":"),
        trimRange: (line, start, end) => ({ start, end }),
        getSourceSyncMode: () => mode
    });

    return {
        bridge,
        panel,
        postedMessages,
        openDocumentCalls,
        executeCommandCalls,
        errorMessages
    };
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
    const document = createDocument("D:\\LabProjects\\Inscape\\samples\\court-loop.inscape");

    {
        const offBridge = createBridge("off").bridge;
        const clickBridge = createBridge("click").bridge;
        const selectionBridge = createBridge("selection").bridge;
        assert(!offBridge.shouldProvideClickReveal(document), "`off` mode must disable Ctrl+Click preview reveal.");
        assert(clickBridge.shouldProvideClickReveal(document), "`click` mode must keep Ctrl+Click preview reveal.");
        assert(selectionBridge.shouldProvideClickReveal(document), "`selection` mode must keep Ctrl+Click preview reveal.");
    }

    {
        const { bridge } = createBridge("off");
        let revealCalls = 0;
        bridge.reveal = async () => {
            revealCalls += 1;
        };

        bridge.rememberDefinition(document, {
            range: {
                contains() {
                    return true;
                }
            },
            payload: {
                sourcePath: document.uri.fsPath,
                line: 12,
                character: 4,
                length: 8
            }
        });

        await bridge.handleSelectionChange({}, createEvent(document, createSelection(12, 4, 12), 2));
        assert(revealCalls === 0, "`off` mode must not turn pending definition clicks into preview reveal.");
    }

    {
        const { bridge, postedMessages, executeCommandCalls } = createBridge("click", { withOpenPanel: true });
        await bridge.handleSelectionChange({}, createEvent(document, createSelection(20, 3, 9), 2));
        await wait(180);
        assert(postedMessages.length === 0, "`click` mode must not auto-follow plain selection changes.");
        assert(executeCommandCalls.length === 0, "`click` mode selection changes must not open preview panels.");
    }

    {
        const { bridge, postedMessages, executeCommandCalls } = createBridge("selection", { withOpenPanel: true });
        await bridge.handleSelectionChange({}, createEvent(document, createSelection(24, 5, 11), 2));
        await wait(180);
        assert(postedMessages.length === 1, "`selection` mode must send revealSource to an already-open preview.");
        assert(postedMessages[0].type === "revealSource", "`selection` mode must use revealSource messages.");
        assert(postedMessages[0].source.line === 24, "`selection` mode must preserve the editor line.");
        assert(postedMessages[0].source.character === 5, "`selection` mode must preserve the selection start character.");
        assert(executeCommandCalls.length === 0, "`selection` mode must not open preview panels implicitly.");
    }

    {
        const { bridge, postedMessages } = createBridge("selection");
        await bridge.handleSelectionChange({}, createEvent(document, createSelection(28, 1, 7), 2));
        await wait(180);
        assert(postedMessages.length === 0, "`selection` mode must stay idle when no preview panel is open.");
    }

    console.log("preview source sync modes ok");
}

main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
});
