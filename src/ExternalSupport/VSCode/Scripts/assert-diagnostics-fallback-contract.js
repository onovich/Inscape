"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { DslScriptDiagnosticController } = require(path.join("..", "DslScript", "Controllers", "DslScriptDiagnosticController"));
const { DslScriptDiagnosticScheduler } = require(path.join("..", "DslScript", "Controllers", "DslScriptDiagnosticScheduler"));

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

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

function createDocument(filePath, text) {
    const lines = text.split(/\r?\n/);
    return {
        uri: {
            fsPath: filePath,
            toString() {
                return filePath;
            }
        },
        languageId: "inscape",
        lineCount: lines.length,
        getText() {
            return text;
        },
        lineAt(index) {
            const lineText = lines[index] || "";
            return {
                text: lineText,
                range: new FakeRange(index, 0, index, Math.max(1, lineText.length))
            };
        }
    };
}

function createVscode(configurationValues, document, onDiagnosticSet) {
    return {
        workspace: {
            getConfiguration() {
                return {
                    get(key, fallbackValue) {
                        return Object.prototype.hasOwnProperty.call(configurationValues, key)
                            ? configurationValues[key]
                            : fallbackValue;
                    }
                };
            },
            getWorkspaceFolder() {
                return {
                    uri: {
                        fsPath: "D:\\LabProjects\\Inscape"
                    }
                };
            },
            workspaceFolders: [
                {
                    uri: {
                        fsPath: "D:\\LabProjects\\Inscape"
                    }
                }
            ],
            textDocuments: [document]
        },
        Diagnostic: FakeDiagnostic,
        Range: FakeRange,
        DiagnosticSeverity: {
            Error: "error",
            Warning: "warning",
            Information: "information",
            Hint: "hint"
        },
        languages: {
            createDiagnosticCollection() {
                return new FakeDiagnosticCollection(onDiagnosticSet);
            }
        }
    };
}

async function waitFor(predicate, timeoutMs) {
    const startedAt = Date.now();
    while (!predicate()) {
        if (Date.now() - startedAt > timeoutMs) {
            throw new Error("Timed out while waiting for diagnostics result.");
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

async function runLanguageServerFallbackScenario() {
    const document = createDocument(
        "D:\\LabProjects\\Inscape\\samples\\court-loop.inscape",
        "# 法庭开场\n旁白：测试\n"
    );
    const recordedDiagnostics = [];
    const invocations = [];
    const configurationValues = {
        "compiler.command": "dotnet",
        "compiler.args": [
            "run",
            "--project",
            "${workspaceFolder}/src/Internal/Cli/Inscape.Cli/Inscape.Cli.csproj",
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

    const vscode = createVscode(configurationValues, document, (uri, diagnostics) => {
        recordedDiagnostics.push({ uri, diagnostics });
    });

    const diagnosticController = new DslScriptDiagnosticController({
        fs,
        os,
        path,
        vscode,
        isInscapeDocument: (value) => value === document,
        normalizePath: (value) => String(value || "").replace(/\//g, "\\").toLowerCase(),
        clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
        resolveLanguageServerProjectPath: () => "D:\\LabProjects\\Inscape\\src\\Internal\\LanguageServer\\Inscape.LanguageServer.csproj"
    });

    const scheduler = new DslScriptDiagnosticScheduler({
        childProcess: {
            execFile(command, args, options, callback) {
                invocations.push({ command, args, cwd: options.cwd });
                const joinedArgs = args.join(" ");
                if (joinedArgs.includes("--diagnose-project")) {
                    callback(new Error("language server unavailable"), "", "language server unavailable");
                    return;
                }

                callback(null, JSON.stringify({
                    diagnostics: [
                        {
                            code: "INS001",
                            severity: "error",
                            message: "compiler fallback ok",
                            location: {
                                sourcePath: document.uri.fsPath,
                                line: 1,
                                character: 0,
                                length: 4
                            }
                        }
                    ]
                }), "");
            }
        },
        fs,
        vscode,
        context: {
            extensionPath: "D:\\LabProjects\\Inscape\\src\\ExternalSupport\\VSCode"
        },
        diagnostics: vscode.languages.createDiagnosticCollection("inscape"),
        isInscapeDocument: (value) => value === document,
        writeTempDocument: (value) => diagnosticController.writeTempDocument(value),
        createCompilerInvocation: (context, value, tempPath) => diagnosticController.createCompilerInvocation(context, value, tempPath),
        createExtensionDiagnostic: (value, message) => diagnosticController.createExtensionDiagnostic(value, message),
        applyDiagnostics: (collection, currentDocument, diagnostics) => diagnosticController.applyDiagnostics(collection, currentDocument, diagnostics)
    });

    scheduler.run(document);
    await waitFor(() => recordedDiagnostics.length > 0, 1000);

    assert(invocations.length === 2, "LanguageServer fallback scenario must invoke LanguageServer first, then compiler.");
    assert(invocations[0].args.includes("--diagnose-project"), "First diagnostics invocation must target LanguageServer project diagnostics.");
    assert(invocations[1].args.includes("diagnose-project"), "Second diagnostics invocation must target CLI diagnose-project fallback.");
    assert(recordedDiagnostics[0].diagnostics.length === 1, "Compiler fallback scenario must produce one mapped diagnostic.");
    assert(recordedDiagnostics[0].diagnostics[0].message === "compiler fallback ok", "Compiler fallback diagnostic message must survive mapping.");
    assert(recordedDiagnostics[0].diagnostics[0].source === "Inscape", "Compiler fallback diagnostics must come from compiler output, not VSCode warning fallback.");
}

async function runCompilerOnlyScenario() {
    const document = createDocument(
        "D:\\LabProjects\\Inscape\\samples\\court-loop.inscape",
        "# 法庭开场\n旁白：测试\n"
    );
    const invocations = [];
    const recordedDiagnostics = [];
    const configurationValues = {
        "compiler.command": "dotnet",
        "compiler.args": [
            "run",
            "--project",
            "${workspaceFolder}/src/Internal/Cli/Inscape.Cli/Inscape.Cli.csproj",
            "--",
            "diagnose-project",
            "${workspaceFolder}",
            "--override",
            "${documentFile}",
            "${file}"
        ],
        "diagnostics.backend": "compiler",
        "diagnostics.enabled": true,
        "diagnostics.debounceMs": 100
    };

    const vscode = createVscode(configurationValues, document, (uri, diagnostics) => {
        recordedDiagnostics.push({ uri, diagnostics });
    });

    const diagnosticController = new DslScriptDiagnosticController({
        fs,
        os,
        path,
        vscode,
        isInscapeDocument: (value) => value === document,
        normalizePath: (value) => String(value || "").replace(/\//g, "\\").toLowerCase(),
        clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
        resolveLanguageServerProjectPath: () => "D:\\LabProjects\\Inscape\\src\\Internal\\LanguageServer\\Inscape.LanguageServer.csproj"
    });

    const scheduler = new DslScriptDiagnosticScheduler({
        childProcess: {
            execFile(command, args, options, callback) {
                invocations.push({ command, args, cwd: options.cwd });
                callback(null, JSON.stringify({
                    diagnostics: []
                }), "");
            }
        },
        fs,
        vscode,
        context: {
            extensionPath: "D:\\LabProjects\\Inscape\\src\\ExternalSupport\\VSCode"
        },
        diagnostics: vscode.languages.createDiagnosticCollection("inscape"),
        isInscapeDocument: (value) => value === document,
        writeTempDocument: (value) => diagnosticController.writeTempDocument(value),
        createCompilerInvocation: (context, value, tempPath) => diagnosticController.createCompilerInvocation(context, value, tempPath),
        createExtensionDiagnostic: (value, message) => diagnosticController.createExtensionDiagnostic(value, message),
        applyDiagnostics: (collection, currentDocument, diagnostics) => diagnosticController.applyDiagnostics(collection, currentDocument, diagnostics)
    });

    scheduler.run(document);
    await waitFor(() => recordedDiagnostics.length > 0, 1000);

    assert(invocations.length === 1, "`diagnostics.backend=compiler` must skip LanguageServer invocation.");
    assert(invocations[0].args.includes("diagnose-project"), "Compiler-only backend must still call CLI diagnose-project.");
}

async function main() {
    await runLanguageServerFallbackScenario();
    await runCompilerOnlyScenario();
    console.log("diagnostics fallback contract ok");
}

main().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
});
