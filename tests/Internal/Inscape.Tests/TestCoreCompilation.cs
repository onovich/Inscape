using System.Text;
using System.Text.Json;
using Inscape.Core.Analysis;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
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
    }
}
