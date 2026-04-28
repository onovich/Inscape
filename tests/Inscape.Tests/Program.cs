using System.Text;
using System.Text.Json;
using Inscape.Core.Analysis;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using CliProgram = Inscape.Cli.Program;

namespace Inscape.Tests {

    public static class Program {

        public static int Main() {
            List<(string Name, Action Body)> tests = new List<(string Name, Action Body)> {
                ("parse graph with loop", ParseGraphWithLoop),
                ("diagnose missing target", DiagnoseMissingTarget),
                ("diagnose invalid node names", DiagnoseInvalidNodeNames),
                ("hashes are stable", HashesAreStable),
                ("hash ignores file path", HashIgnoresFilePath),
                ("hash ignores line movement", HashIgnoresLineMovement),
                ("hash distinguishes duplicate text", HashDistinguishesDuplicateText),
                ("anchor validator detects collisions", AnchorValidatorDetectsCollisions),
                ("cli diagnose emits json", CliDiagnoseEmitsJson),
                ("project compiler resolves cross-file targets", ProjectCompilerResolvesCrossFileTargets),
                ("project compiler diagnoses duplicate nodes", ProjectCompilerDiagnosesDuplicateNodes),
                ("cli diagnose-project applies override", CliDiagnoseProjectAppliesOverride),
                ("cli compile-project emits project ir", CliCompileProjectEmitsProjectIr),
                ("project compiler uses entry metadata", ProjectCompilerUsesEntryMetadata),
                ("project compiler diagnoses multiple entries", ProjectCompilerDiagnosesMultipleEntries),
                ("project compiler reports fallback entry", ProjectCompilerReportsFallbackEntry),
                ("cli preview-project emits html", CliPreviewProjectEmitsHtml),
                ("cli extract-l10n emits csv", CliExtractL10nEmitsCsv),
                ("cli extract-l10n-project emits csv", CliExtractL10nProjectEmitsCsv),
            };

            int failed = 0;
            foreach ((string name, Action body) in tests) {
                try {
                    body();
                    Console.WriteLine("[pass] " + name);
                } catch (Exception ex) {
                    failed += 1;
                    Console.Error.WriteLine("[fail] " + name + ": " + ex.Message);
                }
            }

            return failed == 0 ? 0 : 1;
        }

        static void ParseGraphWithLoop() {
            string source = """
:: court.intro

旁白：法庭里很安静。
成步堂：现在开始吧。

? 选择行动
  - 询问证言 -> court.cross_exam.loop
  - 查看证物 -> evidence.menu

:: court.cross_exam.loop

证人：我什么都不知道。
-> court.intro

:: evidence.menu

旁白：证物袋里只有一枚旧怀表。
-> court.intro
""";

            CompilationResult result = Compile(source);
            AssertFalse(result.HasErrors, "Expected valid graph.");
            AssertEqual(3, result.Document.Nodes.Count, "Node count");
            AssertEqual(4, result.Document.Edges.Count, "Edge count");

            NarrativeNode intro = result.Document.Nodes[0];
            AssertEqual("court.intro", intro.Name, "First node name");
            AssertEqual(2, intro.Lines.Count, "Intro line count");
            AssertEqual(1, intro.Choices.Count, "Choice group count");
            AssertEqual(2, intro.Choices[0].Options.Count, "Option count");
        }

        static void DiagnoseMissingTarget() {
            string source = """
:: start
旁白：开始。
-> missing.node
""";

            CompilationResult result = Compile(source);
            AssertTrue(result.HasErrors, "Missing target should be an error.");
            AssertTrue(ContainsCode(result, "INS020"), "Expected INS020 missing target diagnostic.");
        }

        static void DiagnoseInvalidNodeNames() {
            string source = """
:: Court Intro
旁白：开始。
-> missing/target
""";

            CompilationResult result = Compile(source);
            AssertTrue(result.HasErrors, "Invalid node names should be errors.");
            AssertTrue(ContainsCode(result, "INS009"), "Expected INS009 invalid node diagnostic.");
            AssertTrue(ContainsCode(result, "INS010"), "Expected INS010 invalid target diagnostic.");
        }

        static void HashesAreStable() {
            string source = """
:: start
旁白：同一句文本。
""";

            CompilationResult first = Compile(source);
            CompilationResult second = Compile(source);
            string a = first.Document.Nodes[0].Lines[0].Anchor;
            string b = second.Document.Nodes[0].Lines[0].Anchor;

            AssertFalse(string.IsNullOrWhiteSpace(a), "Anchor should be present.");
            AssertEqual(a, b, "Anchor should be deterministic.");
            AssertTrue(a.StartsWith("l1_"), "Anchor should expose hash version.");
        }

        static void HashIgnoresFilePath() {
            string source = """
:: start
旁白：同一句文本。
""";

            InscapeCompiler compiler = new InscapeCompiler();
            CompilationResult first = compiler.Compile(source, "memory://first.inscape");
            CompilationResult second = compiler.Compile(source, "memory://moved/second.inscape");

            AssertEqual(first.Document.Nodes[0].Lines[0].Anchor,
                        second.Document.Nodes[0].Lines[0].Anchor,
                        "Anchor should not change when source path changes.");
        }

        static void HashIgnoresLineMovement() {
            string first = """
:: start
旁白：同一句文本。
""";
            string second = """
:: start

@entry
// comment
旁白：同一句文本。
""";

            CompilationResult a = Compile(first);
            CompilationResult b = Compile(second);

            AssertEqual(a.Document.Nodes[0].Lines[0].Anchor,
                        b.Document.Nodes[0].Lines[1].Anchor,
                        "Anchor should not change when non-translatable lines move text.");
        }

        static void HashDistinguishesDuplicateText() {
            string source = """
:: start
旁白：重复文本。
旁白：重复文本。
""";

            CompilationResult result = Compile(source);
            string first = result.Document.Nodes[0].Lines[0].Anchor;
            string second = result.Document.Nodes[0].Lines[1].Anchor;

            AssertFalse(first == second, "Duplicate text in the same node should receive distinct anchors.");
        }

        static void AnchorValidatorDetectsCollisions() {
            InscapeDocument document = new InscapeDocument();

            NarrativeNode firstNode = new NarrativeNode {
                Name = "first.node",
                Source = new SourceSpan("memory://collision.inscape", 1, 1),
            };
            firstNode.Lines.Add(new NarrativeLine {
                Kind = NarrativeLineKind.Narration,
                Text = "First",
                Raw = "First",
                Anchor = "l1_collision",
                Source = new SourceSpan("memory://collision.inscape", 2, 1),
            });

            NarrativeNode secondNode = new NarrativeNode {
                Name = "second.node",
                Source = new SourceSpan("memory://collision.inscape", 4, 1),
            };
            secondNode.Lines.Add(new NarrativeLine {
                Kind = NarrativeLineKind.Narration,
                Text = "Second",
                Raw = "Second",
                Anchor = "l1_collision",
                Source = new SourceSpan("memory://collision.inscape", 5, 1),
            });

            document.Nodes.Add(firstNode);
            document.Nodes.Add(secondNode);

            List<Diagnostic> diagnostics = new List<Diagnostic>();
            new AnchorValidator().Validate(document, diagnostics);

            AssertTrue(ContainsCode(diagnostics, "INS040"), "Expected INS040 anchor collision diagnostic.");
        }

        static void CliDiagnoseEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests");
            Directory.CreateDirectory(directory);

            string path = Path.Combine(directory, "diagnose-" + Guid.NewGuid().ToString("N") + ".inscape");
            File.WriteAllText(path, """
:: start
旁白：开始。
-> missing.node
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "diagnose", path });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                File.Delete(path);
            }

            AssertEqual(0, exitCode, "Diagnose command exit code");
            AssertEqual("", error.ToString().Trim(), "Diagnose command stderr");

            using JsonDocument document = JsonDocument.Parse(output.ToString());
            JsonElement root = document.RootElement;
            AssertEqual("inscape.graph-ir", root.GetProperty("format").GetString(), "Diagnose format");
            AssertTrue(root.GetProperty("hasErrors").GetBoolean(), "Diagnose output should preserve script errors.");
            AssertTrue(root.GetProperty("diagnostics").GetArrayLength() > 0, "Diagnose output should contain diagnostics.");
        }

        static void ProjectCompilerResolvesCrossFileTargets() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: start
旁白：开始。
-> second.node
"""),
                new ProjectSource("memory://b.inscape", """
:: second.node
旁白：第二页。
"""),
            }, "memory://project");

            AssertFalse(ContainsCode(result, "INS020"), "Cross-file target should be resolved.");
            AssertEqual(2, result.Graph.Nodes.Count, "Project graph node count");
            AssertEqual(1, result.Graph.Edges.Count, "Project graph edge count");
        }

        static void ProjectCompilerDiagnosesDuplicateNodes() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: same.node
旁白：第一处。
"""),
                new ProjectSource("memory://b.inscape", """
:: same.node
旁白：第二处。
"""),
            }, "memory://project");

            AssertTrue(result.HasErrors, "Project duplicate node should be an error.");
            AssertTrue(ContainsCode(result, "INS030"), "Expected INS030 duplicate project node diagnostic.");
        }

        static void CliDiagnoseProjectAppliesOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.inscape");

            File.WriteAllText(startPath, """
:: start
旁白：开始。
-> target.node
""", Encoding.UTF8);
            File.WriteAllText(targetPath, """
:: old.node
旁白：旧节点。
""", Encoding.UTF8);
            File.WriteAllText(overridePath, """
:: target.node
旁白：新节点。
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "diagnose-project", directory, "--override", targetPath, overridePath });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            AssertEqual(0, exitCode, "Diagnose-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Diagnose-project command stderr");

            using JsonDocument document = JsonDocument.Parse(output.ToString());
            JsonElement root = document.RootElement;
            AssertEqual("inscape.project-ir", root.GetProperty("format").GetString(), "Diagnose-project format");
            AssertFalse(root.GetProperty("hasErrors").GetBoolean(), "Override should resolve the project target.");
            AssertEqual(0, CountDiagnostics(root, "INS020"), "Override should remove missing target diagnostics.");
        }

        static void CliCompileProjectEmitsProjectIr() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
:: start
@entry
旁白：开始。
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
旁白：第二页。
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "compile-project", directory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            AssertEqual(0, exitCode, "Compile-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Compile-project command stderr");

            using JsonDocument document = JsonDocument.Parse(output.ToString());
            JsonElement root = document.RootElement;
            AssertEqual("inscape.project-ir", root.GetProperty("format").GetString(), "Compile-project format");
            AssertFalse(root.GetProperty("hasErrors").GetBoolean(), "Compile-project hasErrors");
            AssertEqual(2, root.GetProperty("graph").GetProperty("nodes").GetArrayLength(), "Compile-project graph node count");
        }

        static void ProjectCompilerUsesEntryMetadata() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://00-orphan.inscape", """
:: orphan.node
旁白：它在文件顺序上更靠前。
"""),
                new ProjectSource("memory://01-start.inscape", """
:: start
@entry
旁白：真正入口。
-> orphan.node
"""),
            }, "memory://project");

            AssertFalse(result.HasErrors, "@entry project should not have errors.");
            AssertFalse(ContainsAnyCode(result, "INS021"), "@entry should be used for reachability.");
            AssertFalse(ContainsAnyCode(result, "INS032"), "Explicit @entry should suppress fallback diagnostic.");
        }

        static void ProjectCompilerDiagnosesMultipleEntries() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: first.entry
@entry
旁白：入口一。
"""),
                new ProjectSource("memory://b.inscape", """
:: second.entry
@entry
旁白：入口二。
"""),
            }, "memory://project");

            AssertTrue(result.HasErrors, "Multiple entries should be an error.");
            AssertTrue(ContainsCode(result, "INS031"), "Expected INS031 multiple entry diagnostic.");
        }

        static void ProjectCompilerReportsFallbackEntry() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: start
旁白：没有显式入口。
"""),
            }, "memory://project");

            AssertFalse(result.HasErrors, "Fallback entry should not be an error.");
            AssertTrue(ContainsAnyCode(result, "INS032"), "Expected INS032 fallback entry diagnostic.");
        }

        static void CliPreviewProjectEmitsHtml() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
:: start
@entry
旁白：开始。
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
旁白：第二页。
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "preview-project", directory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string html = output.ToString();
            AssertEqual(0, exitCode, "Preview-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Preview-project command stderr");
            AssertTrue(html.Contains("<!doctype html>"), "Preview-project should emit HTML.");
            AssertTrue(html.Contains("inscape.project-ir"), "Preview-project should embed project IR.");
            AssertTrue(html.Contains("second.node"), "Preview-project should include project nodes.");
            AssertTrue(html.Contains("const graph = data.graph ?? data.document;"), "Preview-project should use graph fallback.");
        }

        static void CliExtractL10nEmitsCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string path = Path.Combine(directory, "story.inscape");
            File.WriteAllText(path, """
:: start
Narrator: Hello, "world".
? Choose path
  - Ask again -> second.node

:: second.node
A quiet line.
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "extract-l10n", path });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string csv = output.ToString();
            AssertEqual(0, exitCode, "Extract-l10n command exit code");
            AssertEqual("", error.ToString().Trim(), "Extract-l10n command stderr");
            AssertTrue(csv.Contains("anchor,node,kind,speaker,text,translation,sourcePath,line,column"), "CSV should include header.");
            AssertTrue(csv.Contains("Dialogue"), "CSV should include dialogue rows.");
            AssertTrue(csv.Contains("\"Hello, \"\"world\"\".\""), "CSV should escape commas and quotes.");
            AssertTrue(csv.Contains("ChoicePrompt"), "CSV should include choice prompts.");
            AssertTrue(csv.Contains("ChoiceOption"), "CSV should include choice options.");
            AssertEqual(5, CountCsvLines(csv), "CSV line count");
        }

        static void CliExtractL10nProjectEmitsCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
:: start
@entry
Narrator: Project start.
? Next
  - Continue -> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
Project second line.
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "extract-l10n-project", directory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string csv = output.ToString();
            AssertEqual(0, exitCode, "Extract-l10n-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Extract-l10n-project command stderr");
            AssertTrue(csv.Contains("Project start."), "Project CSV should include first file text.");
            AssertTrue(csv.Contains("Project second line."), "Project CSV should include second file text.");
            AssertFalse(csv.Contains("@entry"), "Project CSV should not include metadata.");
            AssertEqual(5, CountCsvLines(csv), "Project CSV line count");
        }

        static CompilationResult Compile(string source) {
            InscapeCompiler compiler = new InscapeCompiler();
            return compiler.Compile(source, "memory://test.inscape");
        }

        static bool ContainsCode(CompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(ProjectCompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(List<Diagnostic> diagnostics, string code) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                if (diagnostics[i].Code == code && diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsAnyCode(ProjectCompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code) {
                    return true;
                }
            }
            return false;
        }

        static int CountDiagnostics(JsonElement root, string code) {
            int count = 0;
            foreach (JsonElement diagnostic in root.GetProperty("diagnostics").EnumerateArray()) {
                if (diagnostic.TryGetProperty("code", out JsonElement codeElement) && codeElement.GetString() == code) {
                    count += 1;
                }
            }
            return count;
        }

        static int CountCsvLines(string csv) {
            int count = 0;
            using StringReader reader = new StringReader(csv);
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Length > 0) {
                    count += 1;
                }
            }
            return count;
        }

        static void AssertTrue(bool value, string message) {
            if (!value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertFalse(bool value, string message) {
            if (value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertEqual<T>(T expected, T actual, string message) {
            if (!EqualityComparer<T>.Default.Equals(expected, actual)) {
                throw new InvalidOperationException(message + ". Expected: " + expected + ", Actual: " + actual);
            }
        }

    }

}
