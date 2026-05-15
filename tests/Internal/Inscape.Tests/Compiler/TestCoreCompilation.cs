using System.Text;
using System.Text.Json;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

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

            DslScriptCompilationResultModel result = Compile(source);
            AssertFalse(result.HasErrors, "Expected valid graph.");
            AssertEqual(3, result.Document.Nodes.Count, "Node count");
            AssertEqual(4, result.Document.Edges.Count, "Edge count");

            StoryGraphNodeModel intro = result.Document.Nodes[0];
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

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Missing target should be an error.");
            AssertTrue(ContainsCode(result, "INS020"), "Expected INS020 missing target diagnostic.");
        }

        static void DiagnoseInvalidNodeNames() {
            string source = """
:: Court Intro
Narrator: Start.
-> missing/target
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Invalid node names should be errors.");
            AssertTrue(ContainsCode(result, "INS009"), "Expected INS009 invalid node diagnostic.");
            AssertTrue(ContainsCode(result, "INS010"), "Expected INS010 invalid target diagnostic.");
        }

        static void HashesAreStable() {
            string source = """
:: start
Narrator: Same text.
""";

            DslScriptCompilationResultModel first = Compile(source);
            DslScriptCompilationResultModel second = Compile(source);
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

            DslScriptCompilerDomain compiler = new DslScriptCompilerDomain();
            DslScriptCompilationResultModel first = compiler.Compile(source, "memory://first.inscape");
            DslScriptCompilationResultModel second = compiler.Compile(source, "memory://moved/second.inscape");

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

            DslScriptCompilationResultModel a = Compile(first);
            DslScriptCompilationResultModel b = Compile(second);

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

            DslScriptCompilationResultModel result = Compile(source);
            string first = result.Document.Nodes[0].Lines[0].Anchor;
            string second = result.Document.Nodes[0].Lines[1].Anchor;

            AssertFalse(first == second, "Duplicate text in the same node should receive distinct anchors.");
        }

        static void StoryGraphAnchorValidatorDetectsCollisions() {
            DslScriptDocumentModel document = new DslScriptDocumentModel();

            StoryGraphNodeModel firstNode = new StoryGraphNodeModel {
                Name = "first.node",
                Source = new SourceSpanModel("memory://collision.inscape", 1, 1),
            };
            firstNode.Lines.Add(new DslScriptLineModel {
                Kind = DslScriptLineKindModel.Narration,
                Text = "First",
                Raw = "First",
                Anchor = "l1_collision",
                Source = new SourceSpanModel("memory://collision.inscape", 2, 1),
            });

            StoryGraphNodeModel secondNode = new StoryGraphNodeModel {
                Name = "second.node",
                Source = new SourceSpanModel("memory://collision.inscape", 4, 1),
            };
            secondNode.Lines.Add(new DslScriptLineModel {
                Kind = DslScriptLineKindModel.Narration,
                Text = "Second",
                Raw = "Second",
                Anchor = "l1_collision",
                Source = new SourceSpanModel("memory://collision.inscape", 5, 1),
            });

            document.Nodes.Add(firstNode);
            document.Nodes.Add(secondNode);

            List<DiagnosticModel> diagnostics = new List<DiagnosticModel>();
            new StoryGraphAnchorValidatorDomain().Validate(document, diagnostics);

            AssertTrue(ContainsCode(diagnostics, "INS040"), "Expected INS040 anchor collision diagnostic.");
        }

        static void SourceSpansCoverAuthoringElements() {
            DslScriptCompilerDomain compiler = new DslScriptCompilerDomain();
            DslScriptCompilationResultModel result = compiler.Compile("""
:: start
@entry
  旁白：第一句中文对白。
? 选择路径
  - 追问证人 -> second.node
  - 查看证物 -> second.node
-> second.node

:: second.node
旁白：第二句。
""", "memory://source-map.inscape");

            AssertFalse(result.HasErrors, "Source map fixture should be valid at single-file parse stage.");

            StoryGraphNodeModel start = result.Document.Nodes[0];
            AssertSource("memory://source-map.inscape", 1, 1, start.Source, "Node source");
            AssertSource("memory://source-map.inscape", 2, 1, start.Lines[0].Source, "Metadata source");
            AssertEqual(DslScriptLineKindModel.Metadata, start.Lines[0].Kind, "Metadata kind");
            AssertSource("memory://source-map.inscape", 3, 3, start.Lines[1].Source, "Chinese dialogue source");
            AssertEqual(DslScriptLineKindModel.Dialogue, start.Lines[1].Kind, "Dialogue kind");
            AssertEqual("旁白", start.Lines[1].Speaker, "Dialogue speaker");

            DslScriptChoiceGroupModel choices = start.Choices[0];
            AssertSource("memory://source-map.inscape", 4, 1, choices.Source, "Choice prompt source");
            AssertSource("memory://source-map.inscape", 5, 3, choices.Options[0].Source, "First choice option source");
            AssertSource("memory://source-map.inscape", 6, 3, choices.Options[1].Source, "Second choice option source");

            AssertEqual(3, result.Document.Edges.Count, "Edge count");
            AssertSource("memory://source-map.inscape", 5, 3, result.Document.Edges[0].Source, "First choice edge source");
            AssertSource("memory://source-map.inscape", 6, 3, result.Document.Edges[1].Source, "Second choice edge source");
            AssertSource("memory://source-map.inscape", 7, 1, result.Document.Edges[2].Source, "Default jump edge source");
        }

        static void ProjectDiagnosticsPreserveCrossFileSource() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
:: start
旁白：开始。
-> second.node
"""),
                new DslScriptSourceModel("memory://b.inscape", """
:: second.node
旁白：第二页。
  - 错误选项 -> missing.node
"""),
            }, "memory://project");

            DiagnosticModel missingTarget = result.Diagnostics[0];
            bool foundMissingTarget = false;
            foreach (DiagnosticModel diagnostic in result.Diagnostics) {
                if (diagnostic.Code == "INS020") {
                    missingTarget = diagnostic;
                    foundMissingTarget = true;
                    break;
                }
            }

            AssertTrue(foundMissingTarget, "Expected cross-file missing target diagnostic.");
            AssertEqual("memory://b.inscape", missingTarget.SourcePath, "Missing target source path");
            AssertEqual(3, missingTarget.Line, "Missing target line");
            AssertEqual(3, missingTarget.Column, "Missing target column");
        }
    }
}
