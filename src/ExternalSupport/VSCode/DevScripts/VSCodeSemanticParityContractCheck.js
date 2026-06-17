"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { LanguageServerSessionClient } = require(path.join("..", "LanguageServer", "Clients", "LanguageServerSessionClient"));
const { DslScriptCompletionProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptCompletionProvider"));
const { DslScriptDefinitionProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptDefinitionProvider"));
const { DslScriptDocumentSymbolProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptDocumentSymbolProvider"));
const { DslScriptHoverProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptHoverProvider"));
const { DslScriptNodeProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptNodeProvider"));
const { DslScriptReferenceProvider } = require(path.join("..", "Scripts", "DslScript", "Providers", "DslScriptReferenceProvider"));
const { DslScriptDiagnosticController } = require(path.join("..", "Scripts", "DslScript", "Controllers", "DslScriptDiagnosticController"));
const { DslScriptDiagnosticScheduler } = require(path.join("..", "Scripts", "DslScript", "Controllers", "DslScriptDiagnosticScheduler"));
const { EditorAuthoringLocationProvider } = require(path.join("..", "Scripts", "EditorAuthoring", "Providers", "EditorAuthoringLocationProvider"));

const moduleRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(moduleRoot, "..", "..", "..");
const tempPrefix = path.join(fs.realpathSync.native(os.tmpdir()), "inscape-vscode-semantic-parity-");

const savedOpeningText = `# Opening
Narrator: Saved file.
-> Evidence`;

const draftOpeningText = `# Opening
Narrator: Start.
-> Evidence
-> MissingTarget

# DraftOnly
Narrator: Unsaved current draft node.`;

const evidenceText = `# Evidence
Narrator: The evidence is ready.`;

class FakeRange {
    constructor(startLine, startCharacter, endLine, endCharacter) {
        this.start = { line: startLine, character: startCharacter };
        this.end = { line: endLine, character: endCharacter };
    }
}

class FakeDiagnostic {
    constructor(range, message, severity) {
        this.range = range;
        this.message = message;
        this.severity = severity;
        this.source = undefined;
        this.code = undefined;
    }
}

class FakeLocation {
    constructor(uri, range) {
        this.uri = uri;
        this.range = range;
    }
}

class FakeCompletionItem {
    constructor(label, kind) {
        this.label = label;
        this.kind = kind;
        this.insertText = undefined;
        this.detail = undefined;
        this.documentation = undefined;
        this.sortText = undefined;
        this.range = undefined;
    }
}

class FakeMarkdownString {
    constructor(value) {
        this.value = value || "";
        this.isTrusted = undefined;
    }

    appendMarkdown(value) {
        this.value += value;
    }
}

class FakeHover {
    constructor(contents, range) {
        this.contents = Array.isArray(contents) ? contents : [contents];
        this.range = range;
    }
}

class FakeDocumentSymbol {
    constructor(name, detail, kind, range, selectionRange) {
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}

class FakeDiagnosticCollection {
    constructor(onSet) {
        this.onSet = onSet;
    }

    set(uri, diagnostics) {
        this.onSet(uri, diagnostics);
    }

    delete() {
    }
}

async function main() {
    const tempRoot = fs.mkdtempSync(tempPrefix);
    const storyRoot = path.join(tempRoot, "story");
    const openingPath = path.join(storyRoot, "opening.inscape");
    const evidencePath = path.join(storyRoot, "evidence.inscape");
    fs.mkdirSync(storyRoot, { recursive: true });
    fs.writeFileSync(openingPath, savedOpeningText, "utf8");
    fs.writeFileSync(evidencePath, evidenceText, "utf8");

    const openingDocument = createDocument(openingPath, draftOpeningText, 2);
    const evidenceDocument = createDocument(evidencePath, evidenceText, 1);
    const recordedDiagnostics = [];
    const vscode = createVscode(tempRoot, [openingDocument, evidenceDocument], (uri, diagnostics) => {
        if (process.env.INSCAPE_DEBUG_VSCODE_SEMANTIC_PARITY === "1") {
            console.error("diagnostics set " + uri.fsPath + ": " + JSON.stringify(diagnostics));
        }
        recordedDiagnostics.push({ uri, diagnostics });
    });

    const languageServerSessionClient = new LanguageServerSessionClient({
        childProcess,
        fs,
        path,
        vscode,
        resolveLanguageServerProjectPath: () => path.join(repoRoot, "src", "Internal", "LanguageServer", "Inscape.LanguageServer.csproj"),
        logOutput: () => { }
    });
    const requestLanguageServer = languageServerSessionClient.request.bind(languageServerSessionClient);
    languageServerSessionClient.request = async (document, method, params) => {
        const result = await requestLanguageServer(document, method, params);
        if (process.env.INSCAPE_DEBUG_VSCODE_SEMANTIC_PARITY === "1") {
            console.error(method + ": " + JSON.stringify(result));
        }
        return result;
    };

    try {
        const providers = createProviders(vscode, languageServerSessionClient, tempRoot);
        await assertDiagnostics(recordedDiagnostics, providers.diagnosticScheduler, openingDocument);
        await assertCompletion(providers.completionProvider, openingDocument);
        await assertDefinition(providers.definitionProvider, openingDocument, evidencePath);
        await assertReferences(providers.referenceProvider, openingDocument);
        await assertHover(providers.hoverProvider, openingDocument);
        await assertDocumentSymbols(providers.documentSymbolProvider, openingDocument);
        assertP2SharedBoundaryContracts();
        console.log("VSCode semantic parity contract ok");
    } finally {
        languageServerSessionClient.dispose();
        await removeTempRoot(tempRoot);
    }
}

function createProviders(vscode, languageServerSessionClient, workspaceRoot) {
    const nodeProvider = new DslScriptNodeProvider({
        vscode,
        collectWorkspaceTextSources: () => [],
        isJumpReferenceLine
    });
    const locationProvider = new EditorAuthoringLocationProvider({
        path,
        vscode,
        normalizePath
    });

    const locationFactory = (item) => locationProvider.createLocation(item);
    const diagnosticController = new DslScriptDiagnosticController({
        fs,
        os,
        path,
        vscode,
        isInscapeDocument,
        normalizePath,
        clamp,
        resolveLanguageServerProjectPath: () => path.join(repoRoot, "src", "Internal", "LanguageServer", "Inscape.LanguageServer.csproj")
    });

    const diagnosticScheduler = new DslScriptDiagnosticScheduler({
        childProcess,
        fs,
        vscode,
        context: {
            extensionPath: moduleRoot
        },
        diagnostics: vscode.languages.createDiagnosticCollection("inscape"),
        isInscapeDocument,
        writeTempDocument: (document) => diagnosticController.writeTempDocument(document),
        createCompilerInvocation: (context, document, tempPath) => diagnosticController.createCompilerInvocation(context, document, tempPath),
        createExtensionDiagnostic: (document, message) => diagnosticController.createExtensionDiagnostic(document, message),
        applyDiagnostics: (collection, document, diagnostics) => diagnosticController.applyDiagnostics(collection, document, diagnostics),
        languageServerSessionClient
    });

    return {
        diagnosticScheduler,
        completionProvider: new DslScriptCompletionProvider({
            childProcess,
            fs,
            os,
            path,
            vscode,
            isInscapeDocument,
            isJumpTargetContext,
            languageServerSessionClient,
            isSpeakerCompletionContext: () => false,
            dslScriptSpeakerProvider: emptySpeakerProvider(vscode),
            hostBindingProvider: emptyHostBindingProvider(),
            dslScriptQueryInterpolationProvider: emptyQueryInterpolationProvider(),
            dslScriptHostEventProvider: emptyHostEventProvider()
        }),
        definitionProvider: new DslScriptDefinitionProvider({
            childProcess,
            fs,
            os,
            path,
            vscode,
            isInscapeDocument,
            createLocation: locationFactory,
            uniqueLocations: (locations) => locationProvider.uniqueLocations(locations),
            languageServerSessionClient,
            dslScriptNodeProvider: nodeProvider,
            dslScriptSpeakerProvider: emptySpeakerProvider(vscode),
            hostBindingProvider: emptyHostBindingProvider(),
            dslScriptMetadataProvider: emptyMetadataProvider(),
            previewRevealBridge: emptyPreviewRevealBridge()
        }),
        referenceProvider: new DslScriptReferenceProvider({
            childProcess,
            fs,
            os,
            path,
            vscode,
            isInscapeDocument,
            createLocation: locationFactory,
            uniqueLocations: (locations) => locationProvider.uniqueLocations(locations),
            languageServerSessionClient,
            dslScriptNodeProvider: nodeProvider,
            dslScriptSpeakerProvider: emptySpeakerProvider(vscode)
        }),
        hoverProvider: new DslScriptHoverProvider({
            childProcess,
            fs,
            os,
            path,
            vscode,
            isInscapeDocument,
            languageServerSessionClient,
            dslScriptNodeProvider: nodeProvider,
            dslScriptSpeakerProvider: emptySpeakerProvider(vscode),
            hostBindingProvider: emptyHostBindingProvider(),
            dslScriptMetadataProvider: emptyMetadataProvider(),
            dslScriptQueryInterpolationProvider: emptyQueryInterpolationProvider(),
            dslScriptHostEventProvider: emptyHostEventProvider(),
            isDebugSourceSyncMode: () => false,
            localizationLineMapDebugController: {
                tryCreateHover: async () => undefined
            }
        }),
        documentSymbolProvider: new DslScriptDocumentSymbolProvider({
            childProcess,
            fs,
            os,
            path,
            vscode,
            languageServerSessionClient
        })
    };
}

async function assertDiagnostics(recordedDiagnostics, diagnosticScheduler, document) {
    diagnosticScheduler.run(document);
    await waitFor(() => recordedDiagnostics.some((entry) =>
        entry.uri.fsPath === document.uri.fsPath
        && entry.diagnostics.some((diagnostic) => diagnostic.code === "INS020")
    ), 5000);
}

async function assertCompletion(provider, document) {
    const completions = await provider.provideCompletionItems(document, { line: 3, character: 3 });
    assertIncludesCompletion(completions, "Evidence");
    assertIncludesCompletion(completions, "DraftOnly");
}

async function assertDefinition(provider, document, expectedPath) {
    const locations = await provider.provideDefinition(document, { line: 2, character: 4 });
    const location = Array.isArray(locations) ? locations[0] : undefined;
    assert(location, "VSCode definition provider must return the cross-file Evidence location.");
    assertSamePath(location.uri.fsPath, expectedPath, "VSCode definition provider must resolve Evidence in the cross-file target.");
}

async function assertReferences(provider, document) {
    const locations = await provider.provideReferences(document, { line: 2, character: 4 }, { includeDeclaration: false });
    assert(Array.isArray(locations) && locations.length === 1, "VSCode references provider must return exactly one incoming Evidence jump.");
    assertSamePath(locations[0].uri.fsPath, document.uri.fsPath, "VSCode references provider must point the Evidence reference at the current draft document.");
    assert(locations[0].range.start.line === 2, "VSCode references provider must preserve the Evidence reference line.");
}

async function assertHover(provider, document) {
    const hover = await provider.provideHover(document, { line: 2, character: 4 });
    assert(hover, "VSCode hover provider must return LanguageServer hover for the Evidence jump.");
    const markdown = hover.contents.map((content) => typeof content === "string" ? content : content.value || "").join("\n");
    assert(markdown.includes("Evidence"), "VSCode hover provider must include the Evidence label.");
}

async function assertDocumentSymbols(provider, document) {
    const symbols = await provider.provideDocumentSymbols(document);
    assertIncludesSymbol(symbols, "Opening");
    assertIncludesSymbol(symbols, "DraftOnly");
}

function assertP2SharedBoundaryContracts() {
    const vscodeEditorAuthoringCommand = readRepositoryText("src", "ExternalSupport", "VSCode", "Scripts", "EditorAuthoring", "Commands", "EditorAuthoringCommand.js");
    const vscodeNodeMapReviewController = readRepositoryText("src", "ExternalSupport", "VSCode", "Scripts", "EditorAuthoring", "Controllers", "StoryNodeMapReviewController.js");
    const vscodeLocalizationCommand = readRepositoryText("src", "ExternalSupport", "VSCode", "Scripts", "Localization", "Commands", "LocalizationCommand.js");
    const vscodeLocalizationReviewQuickPickAdapter = readRepositoryText("src", "ExternalSupport", "VSCode", "Scripts", "Localization", "ViewModels", "LocalizationReviewQuickPickAdapter.js");
    const selfHostedTransport = readRepositoryText("src", "ExternalSupport", "SelfHostedEditor", "Scripts", "Backend", "Clients", "EditorBackendTransport.js");
    const selfHostedNodeMapBridge = readRepositoryText("src", "ExternalSupport", "SelfHostedEditor", "Scripts", "EditorAuthoring", "Bridges", "SelfHostedEditorStoryNodeMapBridge.js");
    const selfHostedNodeMapReviewController = readRepositoryText("src", "ExternalSupport", "SelfHostedEditor", "Scripts", "EditorAuthoring", "Controllers", "StoryNodeMapReviewController.js");
    const selfHostedLocalizationRowsModelBuilder = readRepositoryText("src", "ExternalSupport", "SelfHostedEditor", "Scripts", "Localization", "Models", "LocalizationReviewRowsModelBuilder.js");

    assertIncludesText(vscodeEditorAuthoringCommand, "\"update-node-map-project\"", "VSCode stable node map review must keep using the shared update-node-map-project CLI command.");
    assertIncludesText(vscodeEditorAuthoringCommand, "\"apply-node-map-candidate-project\"", "VSCode stable node map candidate apply must keep using the shared apply-node-map-candidate-project CLI command.");
    assertNotIncludesText(vscodeEditorAuthoringCommand, "stable-node-map.write-sidecar", "VSCode must not depend on SelfHostedEditor desktop-only node-map sidecar write-back commands.");
    assertNotIncludesText(vscodeEditorAuthoringCommand, "workspace.write-back-backup", "VSCode must not depend on SelfHostedEditor desktop-only write-back backup commands.");
    assertIncludesText(vscodeNodeMapReviewController, ".review-backup.json", "VSCode may keep its local review-backup/revert file experience.");
    assertIncludesText(vscodeNodeMapReviewController, "applyCandidateStableIdToNodeMap", "VSCode node-map apply UI must delegate to the shared CLI invocation wrapper.");
    assertIncludesText(vscodeNodeMapReviewController, "previewCandidateStableIdToNodeMap", "VSCode node-map preview UI must delegate to the shared CLI invocation wrapper.");
    assertNotIncludesText(vscodeNodeMapReviewController, "JSON.parse", "VSCode node-map review UI must not parse and rewrite the node-map sidecar itself.");
    assertNoP2BatchApplyEntrypoint(vscodeEditorAuthoringCommand, "VSCode stable node map command");
    assertNoP2BatchApplyEntrypoint(vscodeNodeMapReviewController, "VSCode stable node map review UI");

    assertIncludesText(vscodeLocalizationCommand, "\"audit-l10n-alignment-project\"", "VSCode localization alignment review must keep using the shared audit-l10n-alignment-project CLI command.");
    assertIncludesText(vscodeLocalizationCommand, "\"update-l10n-project\"", "VSCode localization update must keep using the shared update-l10n-project CLI command.");
    assertIncludesText(vscodeLocalizationCommand, "\"refresh-l10n-line-map-project\"", "VSCode line identity refresh must keep using the shared refresh-l10n-line-map-project CLI command.");
    assertIncludesText(vscodeLocalizationReviewQuickPickAdapter, "model.signals", "VSCode localization review UI must display shared presenter signals.");
    assertIncludesText(vscodeLocalizationReviewQuickPickAdapter, "model.actionStatus", "VSCode localization review UI may display shared candidate actionStatus text.");
    assertNotMatchingText(vscodeLocalizationReviewQuickPickAdapter, /\b(similarity|rankPenalty|rank-penalty|levenshtein|jaccard|scoreCandidate)\b/, "VSCode localization review UI must not recompute candidate scoring or ranking.");

    assertIncludesText(selfHostedTransport, "StableNodeMapApplyCandidate: \"stable-node-map.apply-candidate\"", "SelfHostedEditor backend transport must expose stable node map candidate apply as a business command.");
    assertIncludesText(selfHostedTransport, "StableNodeMapReview: \"stable-node-map.review\"", "SelfHostedEditor backend transport must expose stable node map review as a business command.");
    assertIncludesText(selfHostedTransport, "StableNodeMapWriteSidecar: \"stable-node-map.write-sidecar\"", "SelfHostedEditor backend transport must keep desktop-only node-map write-back as an explicit command.");
    assertNotIncludesText(selfHostedTransport, "[EditorBackendTransportCommand.StableNodeMapWriteSidecar]", "SelfHostedEditor dev-host HTTP route map must not expose the desktop-only node-map sidecar write command.");
    assertNotIncludesText(selfHostedTransport, "[EditorBackendTransportCommand.WorkspaceWriteBackBackup]", "SelfHostedEditor dev-host HTTP route map must not expose the desktop-only write-back backup command.");
    assertNotIncludesText(selfHostedNodeMapBridge, "\"/api/node-map", "SelfHostedEditor node-map feature bridge must use backend services, not hard-coded dev-host HTTP routes.");
    assertOrderedText(selfHostedNodeMapBridge, "workspaceSessionClient.writeBackBackup", "stableNodeMapClient.writeSidecar", "SelfHostedEditor node-map write-back must create a workspace backup before writing the sidecar.");
    assertIncludesText(selfHostedNodeMapReviewController, "Confirm Apply", "SelfHostedEditor node-map UI must keep explicit confirmation before real apply/write-back.");
    assertIncludesText(selfHostedNodeMapReviewController, "Preview Apply", "SelfHostedEditor node-map UI must keep dry-run preview separate from real apply.");
    assertNoP2BatchApplyEntrypoint(selfHostedNodeMapBridge, "SelfHostedEditor stable node map bridge");
    assertNoP2BatchApplyEntrypoint(selfHostedNodeMapReviewController, "SelfHostedEditor stable node map review UI");
    assertIncludesText(selfHostedLocalizationRowsModelBuilder, "normalizeReviewSignals", "SelfHostedEditor localization rows must preserve shared presenter signals.");
    assertIncludesText(selfHostedLocalizationRowsModelBuilder, "actionStatus", "SelfHostedEditor localization rows must preserve shared candidate actionStatus text.");
}

function createDocument(filePath, text, version) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    return {
        uri: {
            scheme: "file",
            fsPath: filePath,
            toString() {
                return "file:///" + filePath.replace(/\\/g, "/");
            }
        },
        languageId: "inscape",
        version,
        lineCount: lines.length,
        getText() {
            return text;
        },
        lineAt(indexOrPosition) {
            const index = typeof indexOrPosition === "number" ? indexOrPosition : indexOrPosition.line;
            const lineText = lines[index] || "";
            return {
                text: lineText,
                range: new FakeRange(index, 0, index, Math.max(1, lineText.length))
            };
        }
    };
}

function createVscode(workspaceRoot, documents, onDiagnosticSet) {
    return {
        workspace: {
            getConfiguration() {
                return {
                    get(key, fallbackValue) {
                        const values = {
                            "compiler.command": "dotnet",
                            "compiler.args": [
                                "run",
                                "--project",
                                path.join(repoRoot, "src", "Internal", "Cli", "Inscape.Cli", "Inscape.Cli.csproj"),
                                "--",
                                "diagnose-project",
                                "${workspaceFolder}",
                                "--override",
                                "${documentFile}",
                                "${file}"
                            ],
                            "diagnostics.backend": "languageServer",
                            "diagnostics.enabled": true,
                            "diagnostics.debounceMs": 100
                        };

                        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallbackValue;
                    }
                };
            },
            getWorkspaceFolder(documentUri) {
                if (!documentUri || !documentUri.fsPath) {
                    return undefined;
                }

                return normalizePath(documentUri.fsPath).startsWith(normalizePath(workspaceRoot))
                    ? { uri: { fsPath: workspaceRoot }, name: path.basename(workspaceRoot) }
                    : undefined;
            },
            workspaceFolders: [
                {
                    uri: {
                        fsPath: workspaceRoot
                    },
                    name: path.basename(workspaceRoot)
                }
            ],
            textDocuments: documents
        },
        Diagnostic: FakeDiagnostic,
        Range: FakeRange,
        CompletionItem: FakeCompletionItem,
        CompletionItemKind: {
            Reference: "reference"
        },
        DiagnosticSeverity: {
            Error: "error",
            Warning: "warning",
            Information: "information",
            Hint: "hint"
        },
        MarkdownString: FakeMarkdownString,
        Hover: FakeHover,
        Location: FakeLocation,
        DocumentSymbol: FakeDocumentSymbol,
        SymbolKind: {
            Namespace: "namespace"
        },
        Uri: {
            file(filePath) {
                return {
                    scheme: "file",
                    fsPath: filePath,
                    toString() {
                        return "file:///" + filePath.replace(/\\/g, "/");
                    }
                };
            }
        },
        languages: {
            createDiagnosticCollection() {
                return new FakeDiagnosticCollection(onDiagnosticSet);
            }
        }
    };
}

function emptySpeakerProvider(vscode) {
    return {
        getSpeakerAtPosition: () => undefined,
        collectConfiguredDefinitions: async () => [],
        collectWorkspaceReferences: async () => [],
        collectWorkspaceSpeakers: async () => [],
        createCompletionItem(name) {
            return new vscode.CompletionItem(name, vscode.CompletionItemKind.Reference);
        },
        createHoverMarkdown: () => new vscode.MarkdownString("")
    };
}

function emptyHostBindingProvider() {
    return {
        getBindingCompletionContext: () => undefined,
        getBindingAtPosition: () => undefined,
        collectWorkspaceBindings: async () => [],
        createCompletionItem: () => undefined,
        createHoverMarkdown: () => "",
        createMissingHoverMarkdown: () => ""
    };
}

function emptyQueryInterpolationProvider() {
    return {
        getCompletionContext: () => undefined,
        getInterpolationAtPosition: () => undefined,
        collectSchemaQueries: async () => [],
        createCompletionItem: () => undefined,
        createHoverMarkdown: () => "",
        createUnknownHoverMarkdown: () => ""
    };
}

function emptyHostEventProvider() {
    return {
        getEventCompletionContext: () => undefined,
        getEventAtPosition: () => undefined,
        collectSchemaEvents: async () => [],
        createCompletionItem: () => undefined,
        createHoverMarkdown: () => "",
        createUnknownHoverMarkdown: () => ""
    };
}

function emptyMetadataProvider() {
    return {
        getDirectiveAtPosition: () => undefined,
        collectWorkspaceReferences: async () => [],
        createHoverMarkdown: () => ""
    };
}

function emptyPreviewRevealBridge() {
    return {
        getRevealInfoAtPosition: () => undefined,
        shouldProvideClickReveal: () => false,
        rememberDefinition: () => { },
        createDefinitionLink: () => undefined
    };
}

function isInscapeDocument(document) {
    return document && document.languageId === "inscape" && document.uri && document.uri.scheme === "file";
}

function isJumpTargetContext(linePrefix) {
    return /(?:^|\s)->\s*[^/\\\r\n]*$/.test(linePrefix);
}

function isJumpReferenceLine(line) {
    const trimmed = line.trim();
    return trimmed.startsWith("->") || trimmed.startsWith("-");
}

function uniqueLocations(locations) {
    const seen = new Set();
    const result = [];
    for (const location of locations) {
        const key = normalizePath(location.uri.fsPath)
            + ":"
            + location.range.start.line
            + ":"
            + location.range.start.character
            + ":"
            + location.range.end.line
            + ":"
            + location.range.end.character;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(location);
        }
    }

    return result;
}

function waitFor(predicate, timeoutMs) {
    return new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const timer = setInterval(() => {
            if (predicate()) {
                clearInterval(timer);
                resolve();
                return;
            }

            if (Date.now() - startedAt > timeoutMs) {
                clearInterval(timer);
                reject(new Error("Timed out while waiting for VSCode semantic parity diagnostics."));
            }
        }, 10);
    });
}

function assertIncludesCompletion(completions, label) {
    const found = Array.isArray(completions) && completions.some((completion) => completion && completion.label === label);
    assert(found, "VSCode completion provider must include " + label + ".");
}

function assertIncludesSymbol(symbols, name) {
    const found = Array.isArray(symbols) && symbols.some((symbol) => symbol && symbol.name === name);
    assert(found, "VSCode document symbols provider must include " + name + ".");
}

function assertSamePath(actual, expected, message) {
    assert(normalizePath(actual) === normalizePath(expected), message + " Expected " + expected + ", got " + actual + ".");
}

function readRepositoryText(...segments) {
    return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function assertIncludesText(text, expected, message) {
    assert(String(text || "").includes(expected), message);
}

function assertNotIncludesText(text, unexpected, message) {
    assert(!String(text || "").includes(unexpected), message);
}

function assertNotMatchingText(text, pattern, message) {
    assert(!pattern.test(String(text || "")), message);
}

function assertNoP2BatchApplyEntrypoint(text, label) {
    assertNotMatchingText(
        text,
        /\b(applyAll|apply-all|batchApply|batch-apply|bulkApply|bulk-apply|multiApply|multi-apply)\b|Apply All|Batch Apply|Bulk Apply|Multi Apply|Select All Candidates/i,
        label + " must not expose batch / multi-apply entrypoints during P2."
    );
}

function assertOrderedText(text, before, after, message) {
    const source = String(text || "");
    const beforeIndex = source.indexOf(before);
    const afterIndex = source.indexOf(after);
    assert(beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex, message);
}

function normalizePath(value) {
    return path.resolve(String(value || "")).toLowerCase();
}

function clamp(value, minimum, maximum) {
    const number = typeof value === "number" ? value : minimum;
    return Math.max(minimum, Math.min(maximum, number));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function removeTempRoot(tempRoot) {
    const resolvedRoot = path.resolve(tempRoot);
    const resolvedPrefix = path.resolve(tempPrefix);
    if (!resolvedRoot.toLowerCase().startsWith(resolvedPrefix.toLowerCase())) {
        throw new Error("Refusing to remove unexpected temp root: " + resolvedRoot);
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            fs.rmSync(resolvedRoot, { recursive: true, force: true });
            return;
        } catch (error) {
            if (attempt === 4) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}

main().catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
});
