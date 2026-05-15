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

    }

}
