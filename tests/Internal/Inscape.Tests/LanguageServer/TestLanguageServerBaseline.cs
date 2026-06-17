using System.Text.Json;
using System.Text;
using Inscape.LanguageServer;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void LanguageServerDiagnosticsUseEditorCoordinates() {
            DslScriptDiagnosticProvider provider = new DslScriptDiagnosticProvider();
            List<LanguageServerDiagnosticModel> diagnostics = provider.GetDiagnostics("""
# start
旁白：开始。
-> missing.node
? [has_item("silver_key")] -> second.node

# second.node
旁白：第二页。
""", "memory://language-server.inscape");

            LanguageServerDiagnosticModel missingTarget = diagnostics[0];
            bool foundMissingTarget = false;
            bool foundMissingConditionalFallback = false;
            foreach (LanguageServerDiagnosticModel diagnostic in diagnostics) {
                if (diagnostic.Code == "INS020" && !foundMissingTarget) {
                    missingTarget = diagnostic;
                    foundMissingTarget = true;
                } else if (diagnostic.Code == "INS061") {
                    foundMissingConditionalFallback = true;
                }
            }

            AssertTrue(foundMissingTarget, "LanguageServer diagnostics should include Compiler missing-target diagnostic.");
            AssertTrue(foundMissingConditionalFallback, "LanguageServer diagnostics should include Compiler condition fallback diagnostic.");
            AssertEqual("memory://language-server.inscape", missingTarget.Location.SourcePath, "Diagnostic source path");
            AssertEqual(2, missingTarget.Location.Line, "Diagnostic editor line should be 0-based");
            AssertEqual(0, missingTarget.Location.Character, "Diagnostic editor character should be 0-based");
            AssertEqual(1, missingTarget.Location.Length, "Diagnostic editor length");
        }

        static void LanguageServerDefinitionsUseCompilerSourceMap() {
            DslScriptDefinitionProvider provider = new DslScriptDefinitionProvider();
            LanguageServerDefinitionModel? definition = provider.GetNodeDefinition("""
  # start
旁白：开始。

    # second.node
旁白：第二页。
""", "memory://definition.inscape", "second.node");

            AssertTrue(definition != null, "LanguageServer definition should find node by Compiler source map.");
            AssertEqual("second.node", definition!.Name, "Definition name");
            AssertEqual("memory://definition.inscape", definition.Location.SourcePath, "Definition source path");
            AssertEqual(3, definition.Location.Line, "Definition editor line should be 0-based");
            AssertEqual(4, definition.Location.Character, "Definition editor character should be 0-based");
            AssertEqual("second.node".Length, definition.Location.Length, "Definition editor length");
        }

        static void LanguageServerReferencesAndCompletionsUseCompilerGraph() {
            string source = """
# start
旁白：开始。
-> second.node

  # second.node
旁白：第二页。
""";

            DslScriptReferenceProvider referenceProvider = new DslScriptReferenceProvider();
            List<LanguageServerReferenceModel> references = referenceProvider.GetNodeReferences(source, "memory://references.inscape", "second.node");
            AssertEqual(1, references.Count, "Reference count");
            AssertEqual("second.node", references[0].Target, "Reference target");
            AssertEqual(2, references[0].Location.Line, "Reference editor line");
            AssertEqual(0, references[0].Location.Character, "Reference editor character");

            DslScriptCompletionProvider completionProvider = new DslScriptCompletionProvider();
            List<LanguageServerCompletionModel> completions = completionProvider.GetNodeCompletions(source, "memory://references.inscape");
            AssertEqual(2, completions.Count, "Completion count");
            AssertEqual("start", completions[0].Label, "First completion label");
            AssertEqual("node", completions[0].Kind, "Completion kind");
            AssertEqual("second.node", completions[1].Label, "Second completion label");
            AssertEqual(4, completions[1].Location.Line, "Second completion editor line");
            AssertEqual(2, completions[1].Location.Character, "Second completion editor character");
        }

        static void LanguageServerSymbolsAndHoverUseCompilerGraph() {
            string source = """
# start
鏃佺櫧锛氬紑濮嬰€?
-> second.node

  # second.node
鏃佺櫧锛氱浜岄〉銆?
""";

            DslScriptDocumentSymbolProvider symbolProvider = new DslScriptDocumentSymbolProvider();
            List<LanguageServerDocumentSymbolModel> symbols = symbolProvider.GetDocumentSymbols(source, "memory://symbols.inscape");
            AssertEqual(2, symbols.Count, "Document symbol count");
            AssertEqual("start", symbols[0].Name, "First symbol name");
            AssertEqual("node", symbols[0].Kind, "First symbol kind");
            AssertEqual(0, symbols[0].Location.Line, "First symbol editor line");
            AssertEqual(0, symbols[0].Location.Character, "First symbol editor character");
            AssertEqual("second.node", symbols[1].Name, "Second symbol name");
            AssertEqual(4, symbols[1].Location.Line, "Second symbol editor line");
            AssertEqual(2, symbols[1].Location.Character, "Second symbol editor character");

            DslScriptHoverProvider hoverProvider = new DslScriptHoverProvider();
            LanguageServerHoverModel? nodeHover = hoverProvider.GetNodeHover(source, "memory://symbols.inscape", "second.node");
            AssertTrue(nodeHover != null, "Node hover should resolve from Compiler graph.");
            AssertEqual("second.node", nodeHover!.Label, "Node hover label");
            AssertEqual("node", nodeHover.Kind, "Node hover kind");
            AssertTrue(nodeHover.Markdown.Contains("Inscape node"), "Node hover markdown");
            AssertEqual(4, nodeHover.Location.Line, "Node hover editor line");
            AssertEqual(2, nodeHover.Location.Character, "Node hover editor character");

            LanguageServerHoverModel? jumpHover = hoverProvider.GetJumpHover(source, "memory://symbols.inscape", "second.node");
            AssertTrue(jumpHover != null, "Jump hover should resolve from Compiler graph.");
            AssertEqual("second.node", jumpHover!.Label, "Jump hover label");
            AssertEqual("jump", jumpHover.Kind, "Jump hover kind");
            AssertTrue(jumpHover.Markdown.Contains("jump target"), "Jump hover markdown");
            AssertEqual(2, jumpHover.Location.Line, "Jump hover editor line");
            AssertEqual(0, jumpHover.Location.Character, "Jump hover editor character");
        }

        static void LanguageServerEntryProbesEmitStableJson() {
            string source = """
# start
旁白：开始。
-> second.node
-> missing.node

  # second.node
旁白：第二页。
""";

            string sourcePath = Path.Combine(Path.GetTempPath(), "inscape-language-server-probes.inscape");
            File.WriteAllText(sourcePath, source);
            try {
                JsonElement diagnostics = RunLanguageServerForJson(new[] { "--diagnose-file", sourcePath });
                AssertEqual("inscape.language-server-diagnostics", diagnostics.GetProperty("format").GetString(), "Diagnostics probe format");
                AssertEqual(1, diagnostics.GetProperty("formatVersion").GetInt32(), "Diagnostics probe format version");
                AssertTrue(CountJsonItemsWithString(diagnostics.GetProperty("diagnostics"), "code", "INS020") > 0, "Diagnostics probe should include missing target");

                JsonElement definition = RunLanguageServerForJson(new[] { "--definition-file", sourcePath, "second.node" });
                AssertEqual("inscape.language-server-definition", definition.GetProperty("format").GetString(), "Definition probe format");
                JsonElement definitionLocation = definition.GetProperty("definition").GetProperty("location");
                AssertEqual("second.node", definition.GetProperty("definition").GetProperty("name").GetString(), "Definition probe name");
                AssertEqual(5, definitionLocation.GetProperty("line").GetInt32(), "Definition probe editor line");
                AssertEqual(2, definitionLocation.GetProperty("character").GetInt32(), "Definition probe editor character");

                JsonElement references = RunLanguageServerForJson(new[] { "--references-file", sourcePath, "second.node" });
                AssertEqual("inscape.language-server-references", references.GetProperty("format").GetString(), "References probe format");
                JsonElement firstReference = references.GetProperty("references")[0];
                AssertEqual("second.node", firstReference.GetProperty("target").GetString(), "References probe target");
                AssertEqual(2, firstReference.GetProperty("location").GetProperty("line").GetInt32(), "References probe editor line");

                JsonElement completions = RunLanguageServerForJson(new[] { "--completion-file", sourcePath });
                AssertEqual("inscape.language-server-completions", completions.GetProperty("format").GetString(), "Completions probe format");
                AssertTrue(CountJsonItemsWithString(completions.GetProperty("completions"), "label", "start") == 1, "Completions probe should include start");
                AssertTrue(CountJsonItemsWithString(completions.GetProperty("completions"), "label", "second.node") == 1, "Completions probe should include second.node");

                JsonElement symbols = RunLanguageServerForJson(new[] { "--document-symbols-file", sourcePath });
                AssertEqual("inscape.language-server-document-symbols", symbols.GetProperty("format").GetString(), "Symbols probe format");
                AssertTrue(CountJsonItemsWithString(symbols.GetProperty("symbols"), "name", "second.node") == 1, "Symbols probe should include second.node");

                JsonElement hover = RunLanguageServerForJson(new[] { "--hover-file", sourcePath, "jump", "second.node" });
                AssertEqual("inscape.language-server-hover", hover.GetProperty("format").GetString(), "Hover probe format");
                AssertEqual("second.node", hover.GetProperty("hover").GetProperty("label").GetString(), "Hover probe label");
                AssertEqual("jump", hover.GetProperty("hover").GetProperty("kind").GetString(), "Hover probe kind");
            } finally {
                if (File.Exists(sourcePath)) {
                    File.Delete(sourcePath);
                }
            }
        }

        static void LanguageServerProjectDiagnosticsApplyOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-project-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.tmp");

            File.WriteAllText(startPath, """
# start
旁白：开始。
-> target.node
""");

            File.WriteAllText(targetPath, """
# old.node
旁白：旧节点。
""");

            File.WriteAllText(overridePath, """
# target.node
旁白：编辑器未保存的新节点。
""");

            try {
                JsonElement initial = RunLanguageServerForJson(new[] { "--diagnose-project", directory });
                AssertEqual("inscape.language-server-project-diagnostics", initial.GetProperty("format").GetString(), "Project diagnostics probe format");
                AssertEqual(1, initial.GetProperty("formatVersion").GetInt32(), "Project diagnostics probe format version");
                AssertTrue(CountJsonItemsWithString(initial.GetProperty("diagnostics"), "code", "INS020") == 1, "Project diagnostics should report missing target before override");

                JsonElement overridden = RunLanguageServerForJson(new[] { "--diagnose-project", directory, "--override", targetPath, overridePath });
                AssertEqual("inscape.language-server-project-diagnostics", overridden.GetProperty("format").GetString(), "Project diagnostics override probe format");
                AssertTrue(CountJsonItemsWithString(overridden.GetProperty("diagnostics"), "code", "INS020") == 0, "Project diagnostics should apply unsaved override content");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerProjectNavigationUsesProjectGraphAndOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-navigation-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.tmp");

            File.WriteAllText(startPath, """
# start
旁白：开始。
-> target.node
""");

            File.WriteAllText(targetPath, """
# old.node
旁白：旧节点。
""");

            File.WriteAllText(overridePath, """
# target.node
旁白：编辑器未保存的新节点。
""");

            try {
                JsonElement initial = RunLanguageServerForJson(new[] { "--definition-project", directory, "target.node" });
                AssertEqual("inscape.language-server-project-definition", initial.GetProperty("format").GetString(), "Project definition probe format");
                AssertTrue(initial.GetProperty("definition").ValueKind == JsonValueKind.Null, "Project definition should not find target before override");

                JsonElement definition = RunLanguageServerForJson(new[] { "--definition-project", directory, "target.node", "--override", targetPath, overridePath });
                AssertEqual("target.node", definition.GetProperty("definition").GetProperty("name").GetString(), "Project definition should apply override");
                JsonElement definitionLocation = definition.GetProperty("definition").GetProperty("location");
                AssertEqual(targetPath, definitionLocation.GetProperty("sourcePath").GetString(), "Project definition override source path");
                AssertEqual(0, definitionLocation.GetProperty("line").GetInt32(), "Project definition editor line");

                JsonElement references = RunLanguageServerForJson(new[] { "--references-project", directory, "target.node", "--override", targetPath, overridePath });
                AssertEqual("inscape.language-server-project-references", references.GetProperty("format").GetString(), "Project references probe format");
                JsonElement firstReference = references.GetProperty("references")[0];
                AssertEqual("target.node", firstReference.GetProperty("target").GetString(), "Project reference target");
                AssertEqual(startPath, firstReference.GetProperty("location").GetProperty("sourcePath").GetString(), "Project reference source path");
                AssertEqual(2, firstReference.GetProperty("location").GetProperty("line").GetInt32(), "Project reference editor line");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerProjectCompletionsUseProjectGraphAndOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-completion-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.tmp");

            File.WriteAllText(startPath, """
# start
Narrator: start
""");

            File.WriteAllText(targetPath, """
# old.node
Narrator: old node
""");

            File.WriteAllText(overridePath, """
# target.node
Narrator: unsaved node
""");

            try {
                JsonElement initial = RunLanguageServerForJson(new[] { "--completion-project", directory });
                AssertEqual("inscape.language-server-project-completions", initial.GetProperty("format").GetString(), "Project completion probe format");
                AssertTrue(CountJsonItemsWithString(initial.GetProperty("completions"), "label", "start") == 1, "Project completion should include first file node");
                AssertTrue(CountJsonItemsWithString(initial.GetProperty("completions"), "label", "old.node") == 1, "Project completion should include second file node");

                JsonElement overridden = RunLanguageServerForJson(new[] { "--completion-project", directory, "--override", targetPath, overridePath });
                AssertTrue(CountJsonItemsWithString(overridden.GetProperty("completions"), "label", "target.node") == 1, "Project completion should apply override node");
                AssertTrue(CountJsonItemsWithString(overridden.GetProperty("completions"), "label", "old.node") == 0, "Project completion should replace overridden source content");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerProjectHoverUsesProjectGraphAndOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-hover-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.tmp");

            File.WriteAllText(startPath, """
# start
Narrator: start
-> target.node
""");

            File.WriteAllText(targetPath, """
# old.node
Narrator: old node
""");

            File.WriteAllText(overridePath, """
# target.node
Narrator: unsaved node
""");

            try {
                JsonElement initial = RunLanguageServerForJson(new[] { "--hover-project", directory, "node", "target.node" });
                AssertEqual("inscape.language-server-project-hover", initial.GetProperty("format").GetString(), "Project hover probe format");
                AssertTrue(initial.GetProperty("hover").ValueKind == JsonValueKind.Null, "Project node hover should not find target before override");

                JsonElement nodeHover = RunLanguageServerForJson(new[] { "--hover-project", directory, "node", "target.node", "--override", targetPath, overridePath });
                AssertEqual("target.node", nodeHover.GetProperty("hover").GetProperty("label").GetString(), "Project node hover label");
                AssertEqual("node", nodeHover.GetProperty("hover").GetProperty("kind").GetString(), "Project node hover kind");
                JsonElement nodeLocation = nodeHover.GetProperty("hover").GetProperty("location");
                AssertEqual(targetPath, nodeLocation.GetProperty("sourcePath").GetString(), "Project node hover source path");
                AssertEqual(0, nodeLocation.GetProperty("line").GetInt32(), "Project node hover editor line");

                JsonElement jumpHover = RunLanguageServerForJson(new[] { "--hover-project", directory, "jump", "target.node", "--override", targetPath, overridePath });
                AssertEqual("target.node", jumpHover.GetProperty("hover").GetProperty("label").GetString(), "Project jump hover label");
                AssertEqual("jump", jumpHover.GetProperty("hover").GetProperty("kind").GetString(), "Project jump hover kind");
                JsonElement jumpLocation = jumpHover.GetProperty("hover").GetProperty("location");
                AssertEqual(startPath, jumpLocation.GetProperty("sourcePath").GetString(), "Project jump hover source path");
                AssertEqual(2, jumpLocation.GetProperty("line").GetInt32(), "Project jump hover editor line");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerHostSchemaCapabilitiesUseToolingContract() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-host-schema-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string configPath = Path.Combine(directory, "inscape.config.json");
            string schemaPath = Path.Combine(directory, "inscape.host.schema.json");

            File.WriteAllText(configPath, """
{
  "hostSchema": "inscape.host.schema.json"
}
""");

            File.WriteAllText(schemaPath, """
{
  "queries": [
    {
      "name": "player.gold",
      "returnType": "number",
      "description": "Current gold amount"
    }
  ],
  "actions": [
    {
      "name": "quest.accepted",
      "description": "Quest accepted action",
      "mode": "fire",
      "parameters": []
    }
  ],
  "events": [
    {
      "name": "legacy.quest.accepted",
      "description": "Quest accepted event",
      "delivery": "fire-and-forget"
    }
  ]
}
""");

            try {
                JsonElement catalog = RunLanguageServerForJson(new[] { "--host-schema-capabilities-project", directory });
                AssertEqual("inscape.host-schema.capabilities", catalog.GetProperty("format").GetString(), "Host schema capability format");
                AssertEqual(1, catalog.GetProperty("formatVersion").GetInt32(), "Host schema capability format version");
                AssertEqual(directory, catalog.GetProperty("workspace").GetString(), "Host schema capability workspace");
                AssertTrue(catalog.GetProperty("hostSchema").GetProperty("loaded").GetBoolean(), "Host schema should be loaded");
                AssertEqual(schemaPath, catalog.GetProperty("hostSchema").GetProperty("resolvedPath").GetString(), "Host schema resolved path");
                AssertEqual("player.gold", catalog.GetProperty("queries")[0].GetProperty("name").GetString(), "Host schema query name");
                AssertEqual("number", catalog.GetProperty("queries")[0].GetProperty("returnType").GetString(), "Host schema query return type");
                AssertTrue(catalog.GetProperty("queries")[0].GetProperty("isSimpleTextInterpolationQuery").GetBoolean(), "Host schema query should expose Tooling computed property");
                AssertEqual("quest.accepted", catalog.GetProperty("actions")[0].GetProperty("name").GetString(), "Host schema action name");
                AssertEqual("fire", catalog.GetProperty("actions")[0].GetProperty("mode").GetString(), "Host schema action mode");
                AssertTrue(catalog.GetProperty("actions")[0].GetProperty("isNamedHostAction").GetBoolean(), "Host schema action should expose Tooling computed property");
                AssertEqual("legacy.quest.accepted", catalog.GetProperty("events")[0].GetProperty("name").GetString(), "Host schema event name");
                AssertTrue(catalog.GetProperty("events")[0].GetProperty("isNamedHostEvent").GetBoolean(), "Host schema event should expose Tooling computed property");
                AssertTrue(catalog.GetProperty("events")[0].GetProperty("isLegacy").GetBoolean(), "Host schema event should expose legacy marker");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerHostBindingCapabilitiesUseToolingContract() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-host-binding-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string configPath = Path.Combine(directory, "inscape.config.json");
            string bridgePath = Path.Combine(directory, "inscape.host.bridge.json");
            string scriptPath = Path.Combine(directory, "opening.inscape");

            File.WriteAllText(configPath, """
{
  "hostBridge": "inscape.host.bridge.json"
}
""");

            File.WriteAllText(bridgePath, """
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "ids": [
    {
      "kind": "speaker",
      "name": "Narrator",
      "displayName": "Narrator",
      "host": {
        "roleId": 1001
      }
    },
    {
      "kind": "timeline",
      "name": "court_intro",
      "host": {
        "assetId": 2001,
        "addressableKey": "timeline/court_intro"
      }
    }
  ]
}
""");

            File.WriteAllText(scriptPath, """
# opening
Witness: I saw it.
@timeline camera_push
@timeline court_intro
""");

            try {
                JsonElement catalog = RunLanguageServerForJson(new[] { "--host-binding-capabilities-project", directory });
                AssertEqual("inscape.host-binding.capabilities", catalog.GetProperty("format").GetString(), "Host binding capability format");
                AssertEqual(1, catalog.GetProperty("formatVersion").GetInt32(), "Host binding capability format version");
                AssertEqual(directory, catalog.GetProperty("workspace").GetString(), "Host binding capability workspace");
                AssertTrue(catalog.GetProperty("hostBridge").GetProperty("loaded").GetBoolean(), "Host bridge should be loaded");
                AssertEqual(2, catalog.GetProperty("speakers").GetArrayLength(), "Host binding speaker count should include configured and script speakers");
                AssertEqual("Narrator", catalog.GetProperty("speakers")[0].GetProperty("name").GetString(), "Configured speaker should sort first");
                AssertEqual("1001", catalog.GetProperty("speakers")[0].GetProperty("roleId").GetString(), "Configured speaker role id");
                AssertEqual(1, catalog.GetProperty("speakers")[0].GetProperty("locations").GetArrayLength(), "Configured speaker should expose definition location");
                AssertEqual("Witness", catalog.GetProperty("speakers")[1].GetProperty("name").GetString(), "Script speaker should be included");
                AssertEqual("script", catalog.GetProperty("speakers")[1].GetProperty("sourceKind").GetString(), "Script speaker source kind");
                AssertEqual(1, catalog.GetProperty("speakers")[1].GetProperty("locations").GetArrayLength(), "Script speaker should expose reference location");
                AssertEqual(2, catalog.GetProperty("bindings").GetArrayLength(), "Host binding resource count should include configured and script timeline bindings");
                AssertEqual("timeline", catalog.GetProperty("bindings")[0].GetProperty("kind").GetString(), "Configured binding kind");
                AssertEqual("court_intro", catalog.GetProperty("bindings")[0].GetProperty("name").GetString(), "Configured binding name");
                AssertEqual("2001", catalog.GetProperty("bindings")[0].GetProperty("assetId").GetString(), "Configured binding asset id");
                AssertEqual(2, catalog.GetProperty("bindings")[0].GetProperty("locations").GetArrayLength(), "Configured binding should include mapping row and workspace reference");
                AssertEqual("camera_push", catalog.GetProperty("bindings")[1].GetProperty("name").GetString(), "Script timeline binding should be included");
                AssertEqual("script", catalog.GetProperty("bindings")[1].GetProperty("sourceKind").GetString(), "Script timeline source kind");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void LanguageServerStdioSessionServesProjectRequests() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-language-server-session-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.tmp");

            File.WriteAllText(startPath, """
# start
旁白：开始。
-> target.node
""");

            File.WriteAllText(targetPath, """
# old.node
旁白：旧节点。
""");

            File.WriteAllText(overridePath, """
# target.node
旁白：编辑器未保存的新节点。
""");

            try {
                string inputPayload
                    = CreateLanguageServerSessionRequest(1, "initialize", new { processId = 1234 })
                    + CreateLanguageServerSessionRequest(2, "inscape/completionProject", new {
                        rootPath = directory,
                        overrideSourcePath = targetPath,
                        overrideContentPath = overridePath
                    })
                    + CreateLanguageServerSessionRequest(3, "inscape/definitionProject", new {
                        rootPath = directory,
                        target = "target.node",
                        overrideSourcePath = targetPath,
                        overrideContentPath = overridePath
                    })
                    + CreateLanguageServerSessionRequest(4, "shutdown", new { });

                LanguageServerSessionController controller = new LanguageServerSessionController();
                using MemoryStream input = new MemoryStream(Encoding.UTF8.GetBytes(inputPayload));
                using MemoryStream output = new MemoryStream();
                controller.Run(input, output);

                List<JsonElement> responses = ReadLanguageServerSessionResponses(output.ToArray());
                AssertEqual(4, responses.Count, "LanguageServer session response count");
                AssertEqual("Inscape.LanguageServer", responses[0].GetProperty("result").GetProperty("serverInfo").GetProperty("name").GetString(), "LanguageServer session initialize result");

                JsonElement completionResult = responses[1].GetProperty("result");
                AssertEqual("inscape.language-server-project-completions", completionResult.GetProperty("format").GetString(), "LanguageServer session completion format");
                AssertTrue(CountJsonItemsWithString(completionResult.GetProperty("completions"), "label", "target.node") == 1, "LanguageServer session completion should apply override");

                JsonElement definitionResult = responses[2].GetProperty("result");
                AssertEqual("inscape.language-server-project-definition", definitionResult.GetProperty("format").GetString(), "LanguageServer session definition format");
                AssertEqual("target.node", definitionResult.GetProperty("definition").GetProperty("name").GetString(), "LanguageServer session definition label");
                AssertEqual(targetPath, definitionResult.GetProperty("definition").GetProperty("location").GetProperty("sourcePath").GetString(), "LanguageServer session definition source path");

                AssertTrue(responses[3].GetProperty("result").ValueKind == JsonValueKind.Null, "LanguageServer session shutdown should return null result");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static JsonElement RunLanguageServerForJson(string[] args) {
            TextWriter originalOut = Console.Out;
            StringWriter output = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                exitCode = LanguageServerEntry.Main(args);
            } finally {
                Console.SetOut(originalOut);
            }

            AssertEqual(0, exitCode, "LanguageServer probe exit code");
            using JsonDocument document = JsonDocument.Parse(output.ToString());
            return document.RootElement.Clone();
        }

        static int CountJsonItemsWithString(JsonElement items, string propertyName, string value) {
            int count = 0;
            foreach (JsonElement item in items.EnumerateArray()) {
                if (item.TryGetProperty(propertyName, out JsonElement property) && property.GetString() == value) {
                    count += 1;
                }
            }

            return count;
        }

        static string CreateLanguageServerSessionRequest(int id, string method, object parameters) {
            byte[] payload = JsonSerializer.SerializeToUtf8Bytes(new {
                jsonrpc = "2.0",
                id,
                method,
                @params = parameters
            });

            return "Content-Length: "
                + payload.Length
                + "\r\n\r\n"
                + Encoding.UTF8.GetString(payload);
        }

        static List<JsonElement> ReadLanguageServerSessionResponses(byte[] payload) {
            List<JsonElement> responses = new List<JsonElement>();
            int offset = 0;
            while (offset < payload.Length) {
                int headerEnd = FindHeaderEnd(payload, offset);
                string header = Encoding.ASCII.GetString(payload, offset, headerEnd - offset);
                int contentLength = 0;
                foreach (string line in header.Split(new[] { "\r\n" }, StringSplitOptions.RemoveEmptyEntries)) {
                    if (line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) {
                        contentLength = int.Parse(line.Substring("Content-Length:".Length).Trim());
                    }
                }

                AssertTrue(contentLength > 0, "LanguageServer session response must include Content-Length.");
                int bodyOffset = headerEnd + 4;
                string body = Encoding.UTF8.GetString(payload, bodyOffset, contentLength);
                using JsonDocument document = JsonDocument.Parse(body);
                responses.Add(document.RootElement.Clone());
                offset = bodyOffset + contentLength;
            }

            return responses;
        }

        static int FindHeaderEnd(byte[] payload, int offset) {
            for (int index = offset; index <= payload.Length - 4; index += 1) {
                if (payload[index] == '\r'
                    && payload[index + 1] == '\n'
                    && payload[index + 2] == '\r'
                    && payload[index + 3] == '\n') {
                    return index;
                }
            }

            throw new Exception("LanguageServer session response header terminator was not found.");
        }

    }

}
