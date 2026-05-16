using System.Text.Json;
using Inscape.LanguageServer;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void LanguageServerDiagnosticsUseEditorCoordinates() {
            DslScriptDiagnosticProvider provider = new DslScriptDiagnosticProvider();
            List<LanguageServerDiagnosticModel> diagnostics = provider.GetDiagnostics("""
:: start
旁白：开始。
-> missing.node
""", "memory://language-server.inscape");

            LanguageServerDiagnosticModel missingTarget = diagnostics[0];
            bool foundMissingTarget = false;
            foreach (LanguageServerDiagnosticModel diagnostic in diagnostics) {
                if (diagnostic.Code == "INS020") {
                    missingTarget = diagnostic;
                    foundMissingTarget = true;
                    break;
                }
            }

            AssertTrue(foundMissingTarget, "LanguageServer diagnostics should include Compiler missing-target diagnostic.");
            AssertEqual("memory://language-server.inscape", missingTarget.Location.SourcePath, "Diagnostic source path");
            AssertEqual(2, missingTarget.Location.Line, "Diagnostic editor line should be 0-based");
            AssertEqual(0, missingTarget.Location.Character, "Diagnostic editor character should be 0-based");
            AssertEqual(1, missingTarget.Location.Length, "Diagnostic editor length");
        }

        static void LanguageServerDefinitionsUseCompilerSourceMap() {
            DslScriptDefinitionProvider provider = new DslScriptDefinitionProvider();
            LanguageServerDefinitionModel? definition = provider.GetNodeDefinition("""
  :: start
旁白：开始。

    :: second.node
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
:: start
旁白：开始。
-> second.node

  :: second.node
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
:: start
鏃佺櫧锛氬紑濮嬰€?
-> second.node

  :: second.node
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
:: start
旁白：开始。
-> second.node
-> missing.node

  :: second.node
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

    }

}
