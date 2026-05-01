using System.Text;
using System.Text.Json;
using Inscape.Core.Analysis;
using Inscape.Adapters.UnitySample;
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
                ("cli commands lists command reference", CliCommandsListsCommandReference),
                ("cli help emits command details", CliHelpEmitsCommandDetails),
                ("cli export-host-schema-template emits json", CliExportHostSchemaTemplateEmitsJson),
                ("project compiler resolves cross-file targets", ProjectCompilerResolvesCrossFileTargets),
                ("project compiler diagnoses duplicate nodes", ProjectCompilerDiagnosesDuplicateNodes),
                ("cli diagnose-project applies override", CliDiagnoseProjectAppliesOverride),
                ("cli compile-project emits project ir", CliCompileProjectEmitsProjectIr),
                ("project compiler uses entry metadata", ProjectCompilerUsesEntryMetadata),
                ("project compiler applies entry override", ProjectCompilerAppliesEntryOverride),
                ("project compiler diagnoses missing entry override", ProjectCompilerDiagnosesMissingEntryOverride),
                ("project compiler diagnoses multiple entries", ProjectCompilerDiagnosesMultipleEntries),
                ("project compiler reports fallback entry", ProjectCompilerReportsFallbackEntry),
                ("cli preview-project emits html", CliPreviewProjectEmitsHtml),
                ("cli preview-project applies entry override", CliPreviewProjectAppliesEntryOverride),
                ("cli extract-l10n emits csv", CliExtractL10nEmitsCsv),
                ("cli extract-l10n-project emits csv", CliExtractL10nProjectEmitsCsv),
                ("cli update-l10n preserves translations", CliUpdateL10nPreservesTranslations),
                ("cli update-l10n-project preserves translations", CliUpdateL10nProjectPreservesTranslations),
                ("cli export-unity-sample-binding-template emits csv", CliExportUnitySampleBindingTemplateEmitsCsv),
                ("cli export-unity-sample-role-template emits csv", CliExportUnitySampleRoleTemplateEmitsCsv),
                ("cli export-unity-sample-role-template fills existing role ids", CliExportUnitySampleRoleTemplateFillsExistingRoleIds),
                ("cli UnitySample commands read project config", CliUnitySampleCommandsReadProjectConfig),
                ("cli export-unity-sample-project emits manifest and csv", CliExportUnitySampleProjectEmitsManifestAndCsv),
                ("cli export-unity-sample-project reports unresolved host hooks", CliExportUnitySampleProjectReportsUnresolvedHostHooks),
                ("UnitySample timeline hooks support explicit phases", UnitySampleTimelineHooksSupportExplicitPhases),
                ("cli merge-unity-sample-l10n preserves and clears safely", CliMergeUnitySampleL10nPreservesAndClearsSafely),
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

Narrator: The courtroom is quiet.
Judge: Begin.
? Choose action
    - Question witness -> court.cross_exam.loop
    - Check evidence -> evidence.menu

:: court.cross_exam.loop

Witness: I know nothing.
-> court.intro

:: evidence.menu

Narrator: The evidence bag holds an old watch.
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
Narrator: Start.
-> missing.node
""";

            CompilationResult result = Compile(source);
            AssertTrue(result.HasErrors, "Missing target should be an error.");
            AssertTrue(ContainsCode(result, "INS020"), "Expected INS020 missing target diagnostic.");
        }

        static void DiagnoseInvalidNodeNames() {
            string source = """
:: Court Intro
Narrator: Start.
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
Narrator: Same text.
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
Narrator: Same text.
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
Narrator: Same text.
""";
            string second = """
:: start

@entry
// comment
Narrator: Same text.
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
Narrator: Repeated text.
Narrator: Repeated text.
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
Narrator: Start.
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

        static void CliCommandsListsCommandReference() {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "commands" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string text = output.ToString();
            AssertEqual(0, exitCode, "Commands command exit code");
            AssertEqual("", error.ToString().Trim(), "Commands command stderr");
            AssertTrue(text.Contains("Single-file:"), "Commands should list single-file group.");
            AssertTrue(text.Contains("Host schema:"), "Commands should list host schema group.");
            AssertTrue(text.Contains("export-host-schema-template"), "Commands should list host schema template command.");
            AssertTrue(text.Contains("export-unity-sample-role-template"), "Commands should list UnitySample role template command.");
            AssertTrue(text.Contains("Run `inscape help <command>`"), "Commands should explain command help.");
        }

        static void CliHelpEmitsCommandDetails() {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "help", "export-unity-sample-project" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string text = output.ToString();
            AssertEqual(0, exitCode, "Help command exit code");
            AssertEqual("", error.ToString().Trim(), "Help command stderr");
            AssertTrue(text.Contains("export-unity-sample-project"), "Help should include command name.");
            AssertTrue(text.Contains("--unity-sample-role-map"), "Help should include UnitySample role map option.");
            AssertTrue(text.Contains("unity-sample-manifest.json"), "Help should include output file names.");
        }

        static void CliExportHostSchemaTemplateEmitsJson() {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-host-schema-template" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            AssertEqual(0, exitCode, "Host schema template command exit code");
            AssertEqual("", error.ToString().Trim(), "Host schema template command stderr");

            using JsonDocument document = JsonDocument.Parse(output.ToString());
            JsonElement root = document.RootElement;
            AssertEqual("inscape.host-schema", root.GetProperty("format").GetString(), "Host schema format");
            AssertEqual(1, root.GetProperty("formatVersion").GetInt32(), "Host schema version");
            AssertTrue(root.GetProperty("queries").GetArrayLength() > 0, "Host schema should include query examples.");
            AssertTrue(root.GetProperty("events").GetArrayLength() > 0, "Host schema should include event examples.");
            AssertEqual("has_item", root.GetProperty("queries")[0].GetProperty("name").GetString(), "Host schema query example name");
            AssertEqual("open_window", root.GetProperty("events")[0].GetProperty("name").GetString(), "Host schema event example name");
        }

        static void ProjectCompilerResolvesCrossFileTargets() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: start
Narrator: Start.
-> second.node
"""),
                new ProjectSource("memory://b.inscape", """
:: second.node
Narrator: Second page.
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
Narrator: First copy.
"""),
                new ProjectSource("memory://b.inscape", """
:: same.node
Narrator: Second copy.
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
Narrator: Start.
-> target.node
""", Encoding.UTF8);
            File.WriteAllText(targetPath, """
:: old.node
Narrator: Old node.
""", Encoding.UTF8);
            File.WriteAllText(overridePath, """
:: target.node
Narrator: New node.
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
Narrator: Start.
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
Narrator: Second page.
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
            }

            AssertEqual(0, exitCode, "Compile-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Compile-project command stderr");

            using JsonDocument document = JsonDocument.Parse(output.ToString());
            JsonElement root = document.RootElement;
            AssertEqual("inscape.project-ir", root.GetProperty("format").GetString(), "Compile-project format");
            AssertFalse(root.GetProperty("hasErrors").GetBoolean(), "Compile-project hasErrors");
            AssertEqual(2, root.GetProperty("graph").GetProperty("nodes").GetArrayLength(), "Compile-project graph node count");
            AssertEqual("start", root.GetProperty("entryNodeName").GetString(), "Compile-project entry node");
        }

        static void ProjectCompilerUsesEntryMetadata() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://00-orphan.inscape", """
:: orphan.node
Narrator: This file sorts first.
"""),
                new ProjectSource("memory://01-start.inscape", """
:: start
@entry
Narrator: Real entry.
-> orphan.node
"""),
            }, "memory://project");

            AssertFalse(result.HasErrors, "@entry project should not have errors.");
            AssertFalse(ContainsAnyCode(result, "INS021"), "@entry should be used for reachability.");
            AssertFalse(ContainsAnyCode(result, "INS032"), "Explicit @entry should suppress fallback diagnostic.");
            AssertEqual("start", result.EntryNodeName, "@entry node name");
        }

        static void ProjectCompilerAppliesEntryOverride() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://00-orphan.inscape", """
:: orphan.node
Narrator: First by file order.
"""),
                new ProjectSource("memory://01-start.inscape", """
:: start
Narrator: Temporary debug entry.
-> orphan.node
"""),
            }, "memory://project", "start");

            AssertFalse(result.HasErrors, "Entry override project should not have errors.");
            AssertEqual("start", result.EntryNodeName, "Entry override node name");
            AssertFalse(ContainsAnyCode(result, "INS021"), "Entry override should be used for reachability.");
            AssertFalse(ContainsAnyCode(result, "INS032"), "Entry override should suppress fallback diagnostic.");
        }

        static void ProjectCompilerDiagnosesMissingEntryOverride() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: start
Narrator: Start.
"""),
            }, "memory://project", "missing.node");

            AssertTrue(result.HasErrors, "Missing entry override should be an error.");
            AssertTrue(ContainsCode(result, "INS034"), "Expected INS034 missing entry override diagnostic.");
            AssertEqual("", result.EntryNodeName, "Missing entry override should not resolve an entry.");
        }

        static void ProjectCompilerDiagnosesMultipleEntries() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://a.inscape", """
:: first.entry
@entry
Narrator: Entry one.
"""),
                new ProjectSource("memory://b.inscape", """
:: second.entry
@entry
Narrator: Entry two.
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
Narrator: No explicit entry.
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
Narrator: Start.
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
Narrator: Second page.
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
            }

            string html = output.ToString();
            AssertEqual(0, exitCode, "Preview-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Preview-project command stderr");
            AssertTrue(html.Contains("<!doctype html>"), "Preview-project should emit HTML.");
            AssertTrue(html.Contains("inscape.project-ir"), "Preview-project should embed project IR.");
            AssertTrue(html.Contains("second.node"), "Preview-project should include project nodes.");
            AssertTrue(html.Contains("const graph = data.graph ?? data.document;"), "Preview-project should use graph fallback.");
            AssertTrue(html.Contains("const entryName = data.entryNodeName ?? '';"), "Preview-project should read project entry.");
        }

        static void CliPreviewProjectAppliesEntryOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
:: start
@entry
Narrator: Default entry.
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
Narrator: Temporary entry.
-> start
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "preview-project", directory, "--entry", "second.node" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string html = output.ToString();
            AssertEqual(0, exitCode, "Preview-project entry override command exit code");
            AssertEqual("", error.ToString().Trim(), "Preview-project entry override stderr");
            AssertTrue(html.Contains("\"entryNodeName\": \"second.node\""), "Preview-project should serialize entry override.");
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

        static void CliUpdateL10nPreservesTranslations() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string path = Path.Combine(directory, "story.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(path, """
:: start
Narrator: Hello.
""", Encoding.UTF8);
            string initialCsv = RunCliForOutput(new[] { "extract-l10n", path });
            string anchor = FirstDataAnchor(initialCsv);

            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",start,Dialogue,Narrator,Hello.,浣犲ソ,old.inscape,2,1\n"
                              + "l1_removed,old.node,Narration,,Removed.,鏃ц瘧鏂?old.inscape,8,1\n",
                              Encoding.UTF8);
            File.WriteAllText(path, """
:: start
Narrator: Hello.
A new line.
""", Encoding.UTF8);

            string csv;
            try {
                csv = RunCliForOutput(new[] { "update-l10n", path, "--from", oldCsvPath });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(csv.Contains("anchor,node,kind,speaker,text,translation,status,sourcePath,line,column"), "Updated CSV should include status header.");
            AssertTrue(csv.Contains("浣犲ソ,current"), "Updated CSV should preserve existing translation.");
            AssertTrue(csv.Contains("A new line."), "Updated CSV should include new text.");
            AssertTrue(csv.Contains(",new,"), "Updated CSV should mark new rows.");
            AssertTrue(csv.Contains("l1_removed"), "Updated CSV should keep removed rows for review.");
            AssertTrue(csv.Contains(",removed,"), "Updated CSV should mark removed rows.");
            AssertEqual(4, CountCsvLines(csv), "Updated CSV line count");
        }

        static void CliUpdateL10nProjectPreservesTranslations() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "00-start.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(storyPath, """
:: start
@entry
Narrator: Project start.
""", Encoding.UTF8);
            string initialCsv = RunCliForOutput(new[] { "extract-l10n-project", directory });
            string anchor = FirstDataAnchor(initialCsv);

            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",start,Dialogue,Narrator,Project start.,Project translation,old.inscape,3,1\n",
                              Encoding.UTF8);

            string csv;
            try {
                csv = RunCliForOutput(new[] { "update-l10n-project", directory, "--from", oldCsvPath });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(csv.Contains("Project translation,current"), "Project update should preserve existing translation.");
            AssertEqual(2, CountCsvLines(csv), "Project update CSV line count");
        }

        static void CliExportUnitySampleBindingTemplateEmitsCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            string timelineDirectory = Path.Combine(directory, "Assets", "Resources_Runtime", "Timeline");
            Directory.CreateDirectory(directory);
            Directory.CreateDirectory(timelineDirectory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
:: start
@entry
Narrator: Hello.
@timeline court.opening
[timeline: court.close]
@timeline court.opening
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(timelineDirectory, "SO_Timeline_Court_Opening.asset"), """
%YAML 1.1
MonoBehaviour:
  tm:
    timelineId: 101
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(timelineDirectory, "SO_Timeline_Court_Opening.asset.meta"), """
fileFormatVersion: 2
guid: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-binding-template", directory, "--unity-sample-existing-timeline-root", timelineDirectory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string csv = output.ToString();
            AssertEqual(0, exitCode, "export-unity-sample-binding-template command exit code");
            AssertEqual("", error.ToString().Trim(), "export-unity-sample-binding-template stderr");
            AssertTrue(csv.Contains("kind,alias,unitySampleId,unityGuid,addressableKey,assetPath"), "Binding template should include header.");
            AssertTrue(csv.Contains("timeline,court.close,,,,"), "Binding template should include inline timeline alias.");
            AssertTrue(csv.Contains("timeline,court.opening,101,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,Assets/Resources_Runtime/Timeline/SO_Timeline_Court_Opening.asset"), "Binding template should fill matching timeline asset metadata.");
            AssertEqual(3, CountCsvLines(csv), "Binding template CSV line count");
        }

        static void CliExportUnitySampleRoleTemplateEmitsCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
:: start
@entry
Narrator: Hello.
Phoenix: Objection.
Narrator: Again.
"Role,Quoted": Needs escaping.
A quiet narration line.
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-role-template", directory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string csv = output.ToString();
            AssertEqual(0, exitCode, "export-unity-sample-role-template command exit code");
            AssertEqual("", error.ToString().Trim(), "export-unity-sample-role-template stderr");
            AssertTrue(csv.Contains("speaker,roleId"), "Role template should include header.");
            AssertTrue(csv.Contains("Narrator,"), "Role template should include narrator speaker.");
            AssertTrue(csv.Contains("Phoenix,"), "Role template should include speaker.");
            AssertTrue(csv.Contains("\"\"\"Role,Quoted\"\"\","),
                       "Role template should escape commas and quotes.");
            AssertFalse(csv.Contains("quiet narration"), "Role template should not include narration text.");
            AssertEqual(4, CountCsvLines(csv), "Role template CSV line count");
        }

        static void CliExportUnitySampleRoleTemplateFillsExistingRoleIds() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            string roleNameCsvPath = Path.Combine(directory, "L10N_RoleName.csv");
            string reportPath = Path.Combine(directory, "UnitySample-roles.report.csv");
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
:: start
@entry
Narrator: Hello.
Liam: Hello.
Guide: Repeated role name should stay manual.
Unknown: Needs manual fill.
""", Encoding.UTF8);
            File.WriteAllText(roleNameCsvPath, """
ID,Desc,ZH_CN,EN_US,ES_ES
1050,System,Guide,Narrator,
10001,,Guide,,
10011,Banquet,Liam,Liam,
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-role-template", directory, "--unity-sample-existing-role-name-csv", roleNameCsvPath, "--report", reportPath });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string csv = output.ToString();
            AssertEqual(0, exitCode, "export-unity-sample-role-template with role name CSV exit code");
            AssertEqual("", error.ToString().Trim(), "export-unity-sample-role-template with role name CSV stderr");
            AssertTrue(csv.Contains("Narrator,1050"), "Role template should match EN_US role name.");
            AssertTrue(csv.Contains("Liam,10011"), "Role template should match role name.");
            AssertTrue(csv.Contains("Guide,"), "Ambiguous role name should stay unfilled.");
            AssertFalse(csv.Contains("Guide,1050"), "Ambiguous role name should not pick first match.");
            AssertFalse(csv.Contains("Guide,10001"), "Ambiguous role name should not pick second match.");
            AssertTrue(csv.Contains("Unknown,"), "Missing role name should stay unfilled.");

            string report = File.ReadAllText(reportPath, Encoding.UTF8);
            AssertTrue(report.Contains("Narrator,unique,1050"), "Role report should mark unique matches.");
            AssertTrue(report.Contains("Liam,unique,10011"), "Role report should mark unique matches.");
            AssertTrue(report.Contains("Guide,ambiguous,"), "Role report should mark ambiguous matches.");
            AssertTrue(report.Contains("1050|10001"), "Role report should include ambiguous candidate IDs.");
            AssertTrue(report.Contains("Unknown,missing,"), "Role report should mark missing names.");
            Directory.Delete(directory, true);
        }

        static void CliUnitySampleCommandsReadProjectConfig() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            string outputDirectory = Path.Combine(directory, "unity-sample-export");
            string existingTalkingDirectory = Path.Combine(directory, "existing-talking");
            Directory.CreateDirectory(directory);
            Directory.CreateDirectory(configDirectory);
            Directory.CreateDirectory(existingTalkingDirectory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
:: start
@entry
Narrator: Hello.
@timeline court.opening
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(configDirectory, "UnitySample-roles.csv"), "speaker,roleId\nNarrator,42\n", Encoding.UTF8);
            File.WriteAllText(Path.Combine(configDirectory, "UnitySample-bindings.csv"),
                              "kind,alias,unitySampleId,unityGuid,addressableKey,assetPath\n"
                              + "timeline,court.opening,77,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,Assets/Resources_Runtime/Timeline/SO_Timeline_Court_Opening.asset\n",
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(existingTalkingDirectory, "SO_Talking_Existing.asset"), """
%YAML 1.1
MonoBehaviour:
  tm:
    talkingId: 900
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
    "unitySample": {
    "talkingIdStart": 900,
    "roleMap": "config/UnitySample-roles.csv",
    "bindingMap": "config/UnitySample-bindings.csv",
    "existingTalkingRoot": "existing-talking"
  }
}
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-project", directory, "-o", outputDirectory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            try {
                AssertEqual(0, exitCode, "export-unity-sample-project with config command exit code");
                AssertEqual("", output.ToString().Trim(), "export-unity-sample-project with config stdout");
                AssertEqual("", error.ToString().Trim(), "export-unity-sample-project with config stderr");

                string manifestPath = Path.Combine(outputDirectory, "unity-sample-manifest.json");
                using JsonDocument manifest = JsonDocument.Parse(File.ReadAllText(manifestPath, Encoding.UTF8));
                JsonElement root = manifest.RootElement;
                AssertEqual(900, root.GetProperty("talkingIdStart").GetInt32(), "Config talking start id");
                JsonElement firstTalking = root.GetProperty("talkings")[0];
                AssertEqual(901, firstTalking.GetProperty("talkingId").GetInt32(), "Config existing talking root should reserve id");
                AssertEqual(42, firstTalking.GetProperty("roleId").GetInt32(), "Config role map should apply role id");
                JsonElement hook = root.GetProperty("hostHooks")[0];
                AssertEqual(77, hook.GetProperty("unitySampleId").GetInt32(), "Config binding map should resolve timeline id");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliExportUnitySampleProjectEmitsManifestAndCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            string outputDirectory = Path.Combine(directory, "unity-sample-export");
            string roleMapPath = Path.Combine(directory, "UnitySample-roles.csv");
            string bindingMapPath = Path.Combine(directory, "UnitySample-bindings.csv");
            string existingTalkingDirectory = Path.Combine(directory, "existing-talking");
            Directory.CreateDirectory(directory);
            Directory.CreateDirectory(existingTalkingDirectory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
:: start
@entry
Narrator: Hello, "UnitySample".
@timeline court.opening
? Choose
  - Continue -> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
:: second.node
A quiet line.
""", Encoding.UTF8);
            File.WriteAllText(roleMapPath, "speaker,roleId\nNarrator,7\n", Encoding.UTF8);
            File.WriteAllText(bindingMapPath,
                              "kind,alias,unitySampleId,unityGuid,addressableKey,assetPath\n"
                              + "timeline,court.opening,101,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,,Assets/Resources_Runtime/Timeline/SO_Timeline_Ch1_01.asset\n"
                              + "background,bg.court,,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,BG/Court,\"Assets/Art/Court, Main.png\"\n",
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(existingTalkingDirectory, "SO_Talking_Existing.asset"), """
%YAML 1.1
MonoBehaviour:
  tm:
    talkingId: 500
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-project", directory, "--unity-sample-talking-start", "500", "--unity-sample-role-map", roleMapPath, "--unity-sample-binding-map", bindingMapPath, "--unity-sample-existing-talking-root", existingTalkingDirectory, "-o", outputDirectory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            try {
                AssertEqual(0, exitCode, "export-unity-sample-project command exit code");
                AssertEqual("", output.ToString().Trim(), "export-unity-sample-project stdout");
                AssertEqual("", error.ToString().Trim(), "export-unity-sample-project stderr");

                string manifestPath = Path.Combine(outputDirectory, "unity-sample-manifest.json");
                string l10nPath = Path.Combine(outputDirectory, "L10N_Talking.csv");
                string mapPath = Path.Combine(outputDirectory, "inscape-unity-sample-l10n-map.csv");
                string reportPath = Path.Combine(outputDirectory, "unity-sample-export-report.txt");
                AssertTrue(File.Exists(manifestPath), "UnitySample manifest should be written.");
                AssertTrue(File.Exists(l10nPath), "UnitySample L10N csv should be written.");
                AssertTrue(File.Exists(mapPath), "UnitySample anchor map should be written.");
                AssertTrue(File.Exists(reportPath), "UnitySample export report should be written.");

                using JsonDocument manifest = JsonDocument.Parse(File.ReadAllText(manifestPath, Encoding.UTF8));
                JsonElement root = manifest.RootElement;
                AssertEqual("inscape.unity-sample-manifest", root.GetProperty("format").GetString(), "UnitySample manifest format");
                AssertEqual(1, root.GetProperty("formatVersion").GetInt32(), "UnitySample manifest version");
                AssertEqual("start", root.GetProperty("entryNodeName").GetString(), "UnitySample manifest entry node");
                AssertEqual(500, root.GetProperty("talkingIdStart").GetInt32(), "UnitySample talking start id");
                AssertEqual(2, root.GetProperty("nodes").GetArrayLength(), "UnitySample node count");
                AssertEqual(3, root.GetProperty("talkings").GetArrayLength(), "UnitySample talking count");
                AssertEqual(0, root.GetProperty("warnings").GetArrayLength(), "UnitySample warning count");
                AssertEqual(1, root.GetProperty("roles").GetArrayLength(), "UnitySample role count");
                AssertEqual("Narrator", root.GetProperty("roles")[0].GetProperty("speaker").GetString(), "UnitySample role speaker");
                AssertEqual(7, root.GetProperty("roles")[0].GetProperty("roleId").GetInt32(), "UnitySample role id");
                AssertEqual(2, root.GetProperty("hostBindings").GetArrayLength(), "UnitySample host binding count");
                JsonElement timelineBinding = root.GetProperty("hostBindings")[0];
                AssertEqual("timeline", timelineBinding.GetProperty("kind").GetString(), "UnitySample timeline binding kind");
                AssertEqual("court.opening", timelineBinding.GetProperty("alias").GetString(), "UnitySample timeline binding alias");
                AssertEqual(101, timelineBinding.GetProperty("unitySampleId").GetInt32(), "UnitySample timeline binding id");
                JsonElement backgroundBinding = root.GetProperty("hostBindings")[1];
                AssertEqual("background", backgroundBinding.GetProperty("kind").GetString(), "UnitySample background binding kind");
                AssertEqual("BG/Court", backgroundBinding.GetProperty("addressableKey").GetString(), "UnitySample background binding addressable key");
                AssertEqual("Assets/Art/Court, Main.png", backgroundBinding.GetProperty("assetPath").GetString(), "UnitySample binding CSV should support quoted commas");
                AssertEqual(1, root.GetProperty("hostHooks").GetArrayLength(), "UnitySample host hook count");
                JsonElement timelineHook = root.GetProperty("hostHooks")[0];
                AssertEqual("timeline", timelineHook.GetProperty("kind").GetString(), "UnitySample timeline hook kind");
                AssertEqual("court.opening", timelineHook.GetProperty("alias").GetString(), "UnitySample timeline hook alias");
                AssertEqual("talking.exit", timelineHook.GetProperty("phase").GetString(), "UnitySample timeline hook phase");
                AssertEqual(501, timelineHook.GetProperty("targetTalkingId").GetInt32(), "UnitySample timeline hook target talking id");
                AssertEqual(101, timelineHook.GetProperty("unitySampleId").GetInt32(), "UnitySample timeline hook resolved UnitySample id");

                JsonElement firstTalking = root.GetProperty("talkings")[0];
                AssertEqual(501, firstTalking.GetProperty("talkingId").GetInt32(), "First talking id");
                AssertEqual(7, firstTalking.GetProperty("roleId").GetInt32(), "First talking role id");
                AssertEqual(502, firstTalking.GetProperty("nextTalkingId").GetInt32(), "First talking next id");

                JsonElement choiceTalking = root.GetProperty("talkings")[1];
                AssertEqual(502, choiceTalking.GetProperty("talkingId").GetInt32(), "Choice talking id");
                AssertEqual(1, choiceTalking.GetProperty("options").GetArrayLength(), "Choice option count");
                AssertEqual(503, choiceTalking.GetProperty("options")[0].GetProperty("nextTalkingId").GetInt32(), "Choice target talking id");

                string l10n = File.ReadAllText(l10nPath, Encoding.UTF8);
                AssertTrue(l10n.Contains("ID,ZH_CN,EN_US,ES_ES"), "UnitySample L10N should include language header.");
                AssertTrue(l10n.Contains("501,Hello` %UnitySample%."), "UnitySample L10N should apply UnitySample text escaping.");
                AssertTrue(l10n.Contains("502,Choose"), "UnitySample L10N should include choice prompt.");
                AssertFalse(l10n.Contains("Continue"), "UnitySample L10N should not put option text into L10N_Talking yet.");

                string map = File.ReadAllText(mapPath, Encoding.UTF8);
                AssertTrue(map.Contains("TalkingOptionTM.optionText"), "Anchor map should include option text mapping.");
                AssertTrue(map.Contains("Continue"), "Anchor map should preserve option source text.");

                string report = File.ReadAllText(reportPath, Encoding.UTF8);
                AssertTrue(report.Contains("warnings: 0"), "UnitySample report should include warning summary.");
                AssertTrue(report.Contains("hostHooks: 1"), "UnitySample report should include host hook summary.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliExportUnitySampleProjectReportsUnresolvedHostHooks() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            string outputDirectory = Path.Combine(directory, "unity-sample-export");
            string bindingMapPath = Path.Combine(directory, "UnitySample-bindings.csv");
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
:: start
@entry
Narrator: Hello.
@timeline missing.timeline
""", Encoding.UTF8);
            File.WriteAllText(bindingMapPath,
                              "kind,alias,unitySampleId,unityGuid,addressableKey,assetPath\n"
                              + "timeline,unused.timeline,101,,,\n"
                              + "timeline,unused.timeline,102,,,\n",
                              Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "export-unity-sample-project", directory, "--unity-sample-binding-map", bindingMapPath, "-o", outputDirectory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            try {
                AssertEqual(0, exitCode, "export-unity-sample-project unresolved hook command exit code");
                AssertEqual("", output.ToString().Trim(), "export-unity-sample-project unresolved hook stdout");
                AssertEqual("", error.ToString().Trim(), "export-unity-sample-project unresolved hook stderr");

                string manifestPath = Path.Combine(outputDirectory, "unity-sample-manifest.json");
                string reportPath = Path.Combine(outputDirectory, "unity-sample-export-report.txt");
                using JsonDocument manifest = JsonDocument.Parse(File.ReadAllText(manifestPath, Encoding.UTF8));
                JsonElement warnings = manifest.RootElement.GetProperty("warnings");
                AssertEqual(2, warnings.GetArrayLength(), "UnitySample unresolved hook warning count");
                AssertEqual("UnitySample001", warnings[0].GetProperty("code").GetString(), "Duplicate binding warning code");
                AssertEqual("UnitySample002", warnings[1].GetProperty("code").GetString(), "Unresolved timeline warning code");

                string report = File.ReadAllText(reportPath, Encoding.UTF8);
                AssertTrue(report.Contains("warnings: 2"), "UnitySample report should summarize warnings.");
                AssertTrue(report.Contains("UnitySample001"), "UnitySample report should include duplicate binding warning.");
                AssertTrue(report.Contains("UnitySample002"), "UnitySample report should include unresolved timeline warning.");
                AssertTrue(report.Contains("missing.timeline"), "UnitySample report should include missing alias.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void UnitySampleTimelineHooksSupportExplicitPhases() {
            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult project = compiler.Compile(new List<ProjectSource> {
                new ProjectSource("memory://story.inscape", """
:: start
@entry
@timeline.node.enter court.node_enter
Narrator: First line.
@timeline.talking.exit court.first_exit
@timeline.talking.enter court.second_enter
Narrator: Second line.
[timeline.node.exit: court.node_exit]
"""),
            }, "memory://project");

            AssertFalse(project.HasErrors, "Project with timeline phases should compile.");

            UnitySampleExportOptions options = new UnitySampleExportOptions {
                TalkingIdStart = 700,
            };
            AddTimelineBinding(options, "court.node_enter", 101);
            AddTimelineBinding(options, "court.first_exit", 102);
            AddTimelineBinding(options, "court.second_enter", 103);
            AddTimelineBinding(options, "court.node_exit", 104);

            UnitySampleExportResult export = new UnitySampleProjectExporter().Export(project, options);

            AssertEqual(0, export.Manifest.Warnings.Count, "Explicit phases should not create export warnings.");
            AssertEqual(4, export.Manifest.HostHooks.Count, "Timeline hook count");
            AssertEqual("node.enter", export.Manifest.HostHooks[0].Phase, "Node enter phase");
            AssertEqual((int?)700, export.Manifest.HostHooks[0].TargetTalkingId, "Node enter target talking");
            AssertEqual("talking.exit", export.Manifest.HostHooks[1].Phase, "Talking exit phase");
            AssertEqual((int?)700, export.Manifest.HostHooks[1].TargetTalkingId, "Talking exit target talking");
            AssertEqual("talking.enter", export.Manifest.HostHooks[2].Phase, "Talking enter phase");
            AssertEqual((int?)701, export.Manifest.HostHooks[2].TargetTalkingId, "Talking enter target talking");
            AssertEqual("node.exit", export.Manifest.HostHooks[3].Phase, "Node exit phase");
            AssertEqual((int?)701, export.Manifest.HostHooks[3].TargetTalkingId, "Node exit target talking");
        }

        static void CliMergeUnitySampleL10nPreservesAndClearsSafely() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string existingPath = Path.Combine(directory, "existing.csv");
            string generatedPath = Path.Combine(directory, "generated.csv");
            string mergedPath = Path.Combine(directory, "merged.csv");
            string reportPath = Path.Combine(directory, "report.csv");

            File.WriteAllText(existingPath, """
ID,ZH_CN,EN_US,ES_ES
1,鏃ч」鐩枃鏈?Old project,Texto viejo
100,鍘熸枃娌″彉,Keep me,Conservar
101,鏃ф簮鏂囨湰,Old translation,Traduccion vieja
""", Encoding.UTF8);
            File.WriteAllText(generatedPath, """
ID,ZH_CN,EN_US,ES_ES
100,鍘熸枃娌″彉,,
101,鏂版簮鏂囨湰,,
102,鏂板婧愭枃鏈?,
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(new[] { "merge-unity-sample-l10n", generatedPath, "--from", existingPath, "--report", reportPath, "-o", mergedPath });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            try {
                AssertEqual(0, exitCode, "merge-unity-sample-l10n command exit code");
                AssertEqual("", output.ToString().Trim(), "merge-unity-sample-l10n stdout");
                AssertEqual("", error.ToString().Trim(), "merge-unity-sample-l10n stderr");

                string merged = File.ReadAllText(mergedPath, Encoding.UTF8);
                AssertTrue(merged.Contains("1,鏃ч」鐩枃鏈?Old project,Texto viejo"), "Merge should preserve unrelated existing rows.");
                AssertTrue(merged.Contains("100,鍘熸枃娌″彉,Keep me,Conservar"), "Merge should preserve translations when source is unchanged.");
                AssertTrue(merged.Contains("101,鏂版簮鏂囨湰,,"), "Merge should clear target translations when source changes.");
                AssertTrue(merged.Contains("102,鏂板婧愭枃鏈?,"), "Merge should add new generated rows.");
                AssertFalse(merged.Contains("Old translation"), "Stale translation should not remain in merged CSV.");

                string report = File.ReadAllText(reportPath, Encoding.UTF8);
                AssertTrue(report.Contains("changed,101"), "Report should include changed row.");
                AssertTrue(report.Contains("鏃ф簮鏂囨湰"), "Report should preserve old source text.");
                AssertTrue(report.Contains("Old translation"), "Report should preserve old translation for reference.");
                AssertTrue(report.Contains("added,102"), "Report should include added row.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static CompilationResult Compile(string source) {
            InscapeCompiler compiler = new InscapeCompiler();
            return compiler.Compile(source, "memory://test.inscape");
        }

        static void AddTimelineBinding(UnitySampleExportOptions options, string alias, int UnitySampleId) {
            options.HostBindings.Add(new UnitySampleHostBinding {
                Kind = "timeline",
                Alias = alias,
                UnitySampleId = UnitySampleId,
            });
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

        static string FirstDataAnchor(string csv) {
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line = reader.ReadLine();
            if (string.IsNullOrEmpty(line)) {
                throw new InvalidOperationException("CSV does not contain a data row.");
            }

            int comma = line.IndexOf(',');
            if (comma < 0) {
                throw new InvalidOperationException("CSV data row does not contain fields.");
            }

            return line.Substring(0, comma);
        }

        static string RunCliForOutput(string[] args) {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(args);
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            AssertEqual(0, exitCode, "CLI command exit code");
            AssertEqual("", error.ToString().Trim(), "CLI command stderr");
            return output.ToString();
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
