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
# court.intro
Narrator: The courtroom is quiet.
Judge: Begin.
? Choose action
    - Question witness -> court.cross_exam.loop
    - Check evidence -> evidence.menu

# court.cross_exam.loop
Witness: I know nothing.
-> court.intro

# evidence.menu
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
# start
Narrator: Start.
-> missing.node
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Missing target should be an error.");
            AssertTrue(ContainsCode(result, "INS020"), "Expected INS020 missing target diagnostic.");
        }

        static void DiagnoseInvalidNodeNames() {
            string source = """
# Court/Intro
Narrator: Start.
-> missing/target
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Invalid node titles should be errors.");
            AssertTrue(ContainsCode(result, "INS011"), "Expected INS011 invalid title diagnostic.");
            AssertTrue(ContainsCode(result, "INS010"), "Expected INS010 invalid target diagnostic.");
        }

        static void DiagnoseLegacyNodeMarkerAsContent() {
            string source = """
:: old.node
Narrator: Start.
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Legacy node markers should not create nodes.");
            AssertEqual(0, result.Document.Nodes.Count, "Legacy marker should not create a node");
            AssertTrue(ContainsCode(result, "INS001"), "Expected INS001 for content outside a '# Title' node.");
            AssertTrue(ContainsCode(result, "INS008"), "Expected INS008 when no current nodes are declared.");
        }

        static void ParseHashTitleGraphWithChineseJump() {
            string source = """
# 法庭开场

旁白：雨声很重。
-> 证人登场

# 证人登场

艾琳：我到了。
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertFalse(result.HasErrors, "Hash title graph should compile.");
            AssertEqual(2, result.Document.Nodes.Count, "Hash title node count");
            AssertEqual("法庭开场", result.Document.Nodes[0].Name, "First title node name");
            AssertEqual("证人登场", result.Document.Nodes[1].Name, "Second title node name");
            AssertEqual(1, result.Document.Edges.Count, "Hash title edge count");
            AssertEqual("证人登场", result.Document.Edges[0].To, "Hash title jump target");
        }

        static void DiagnoseDuplicateHashTitles() {
            string source = """
# 法庭开场
旁白：第一版。

# 法庭开场
旁白：第二版。
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Duplicate hash titles should be an error.");
            AssertTrue(ContainsCode(result, "INS003"), "Expected INS003 duplicate title diagnostic.");
        }

        static void WarnsWhenHashTitleMissingLeadingBlankLine() {
            string source = """
# 法庭开场
旁白：第一版。
# 证人登场
艾琳：我到了。
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertFalse(result.HasErrors, "Missing title blank line should not block compilation.");
            AssertTrue(ContainsAnyCode(result, "INS012"), "Expected INS012 title spacing hint.");
        }

        static void HashesAreStable() {
            string source = """
# start
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
# start
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
# start
Narrator: Same text.
""";
            string second = """
# start
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
# start
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
# start
@entry
  旁白：第一句中文对白。
? 选择路径
  - 追问证人 -> second.node
  - 查看证物 -> second.node
-> second.node

# second.node
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

        static void ParsesChoiceConditionsIntoIr() {
            string source = """
# start
? Choose action
- [has_item("silver_key") and trust("mira") >= 3] Use silver key -> gate.open
- Leave -> leave

# gate.open
Narrator: Gate opens.

# leave
Narrator: Leave.
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertFalse(result.HasErrors, "Choice condition fixture should compile.");

            StoryGraphNodeModel start = result.Document.Nodes[0];
            DslScriptChoiceOptionModel option = start.Choices[0].Options[0];
            AssertEqual("Use silver key", option.Text, "Condition option text");
            AssertEqual("gate.open", option.Target, "Condition option target");
            AssertTrue(option.Condition != null, "Choice option condition should be present.");
            AssertEqual("has_item(\"silver_key\") and trust(\"mira\") >= 3", option.Condition!.Raw, "Choice condition raw");
            AssertSource("memory://test.inscape", 3, 4, option.Condition.Source, "Choice condition source");

            DslScriptConditionExpressionModel expression = option.Condition.Expression ?? throw new InvalidOperationException("Condition expression missing.");
            AssertEqual(DslScriptConditionExpressionKindModel.Binary, expression.Kind, "Choice condition root kind");
            AssertEqual("and", expression.Operator, "Choice condition root operator");
            AssertEqual(DslScriptConditionExpressionKindModel.Query, expression.Left!.Kind, "Choice condition left kind");
            AssertEqual("has_item", expression.Left.Query!.Name, "Choice condition left query");
            AssertEqual(DslScriptConditionQuerySyntaxModel.Call, expression.Left.Query.Syntax, "Choice condition left query syntax");
            AssertEqual("silver_key", expression.Left.Query.Arguments[0].StringValue, "Choice condition literal argument");
            AssertEqual(DslScriptConditionExpressionKindModel.Comparison, expression.Right!.Kind, "Choice condition right kind");
            AssertEqual(">=", expression.Right.Operator, "Choice condition comparison operator");
            AssertEqual("trust", expression.Right.Left!.Query!.Name, "Choice condition comparison query");

            AssertEqual(2, result.Document.Edges.Count, "Choice condition edge count");
            AssertEqual(StoryGraphEdgeKindModel.Choice, result.Document.Edges[0].Kind, "Choice condition edge kind");
            AssertEqual("Use silver key", result.Document.Edges[0].Label, "Choice condition edge label");
            AssertTrue(result.Document.Edges[0].Condition != null, "Choice edge condition should be present.");
        }

        static void ParsesConditionalJumpsIntoIr() {
            string source = """
# start
? [has_item("silver_key")] -> gate.open
? [lockpick_level() >= 2] -> gate.pick
-> gate.locked

# gate.open
Narrator: Open.

# gate.pick
Narrator: Pick.

# gate.locked
Narrator: Locked.
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertFalse(result.HasErrors, "Conditional jump fixture should compile.");

            StoryGraphNodeModel start = result.Document.Nodes[0];
            AssertEqual(2, start.ConditionalJumps.Count, "Conditional jump count");
            AssertEqual("gate.open", start.ConditionalJumps[0].Target, "First conditional jump target");
            AssertEqual("has_item(\"silver_key\")", start.ConditionalJumps[0].Condition.Raw, "First conditional jump raw");
            AssertSource("memory://test.inscape", 2, 4, start.ConditionalJumps[0].Condition.Source, "First conditional source");
            AssertEqual("gate.locked", start.DefaultNext, "Conditional fallback target");

            AssertEqual(3, result.Document.Edges.Count, "Conditional edge count");
            AssertEqual(StoryGraphEdgeKindModel.Conditional, result.Document.Edges[0].Kind, "First conditional edge kind");
            AssertEqual(StoryGraphEdgeKindModel.Conditional, result.Document.Edges[1].Kind, "Second conditional edge kind");
            AssertEqual(StoryGraphEdgeKindModel.Default, result.Document.Edges[2].Kind, "Fallback edge kind");
            AssertEqual("gate.locked", result.Document.Edges[2].To, "Fallback edge target");
        }

        static void DiagnosesConditionalJumpMissingFallback() {
            string source = """
# start
? [has_item("silver_key")] -> gate.open

# gate.open
Narrator: Open.
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Conditional jump without fallback should be an error.");
            AssertTrue(ContainsCode(result, "INS061"), "Expected INS061 missing conditional fallback diagnostic.");
        }

        static void DiagnosesUnsupportedConditionSyntax() {
            string source = """
# start
? Choose action
- [gold() + 1 > 3] Math -> target
- [has_any(["silver_key"])] Array -> target
- [flag = true] Assign -> target
- [@emit door_open] Action -> target

# target
Narrator: Target.
""";

            DslScriptCompilationResultModel result = Compile(source);
            AssertTrue(result.HasErrors, "Unsupported condition syntax should produce errors.");
            AssertTrue(ContainsCode(result, "INS053"), "Expected INS053 unsupported operator diagnostic.");
            AssertTrue(ContainsCode(result, "INS054"), "Expected INS054 unsupported array diagnostic.");
            AssertTrue(ContainsCode(result, "INS055"), "Expected INS055 unsupported assignment diagnostic.");
            AssertTrue(ContainsCode(result, "INS058"), "Expected INS058 unsupported action diagnostic.");
        }

        static void ProjectDiagnosticsPreserveCrossFileSource() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# start
旁白：开始。
-> second.node
"""),
                new DslScriptSourceModel("memory://b.inscape", """
# second.node
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
