using System.Text;
using System.Text.Json;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Tooling;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void CliPreviewProjectEmitsHtml() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
# start
@entry
Narrator: Start.
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
# second.node
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
                exitCode = CliCore.Main(new[] { "preview-project", directory });
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
# start
@entry
Narrator: Default entry.
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
# second.node
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
                exitCode = CliCore.Main(new[] { "preview-project", directory, "--entry", "second.node" });
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

        static void PreviewHtmlConvertsCompilerSourceCoordinates() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Source mapped line.
""", Encoding.UTF8);

            string html;
            try {
                html = RunCliForOutput(new[] { "preview-project", directory });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(html.Contains("function sourcePayload(source) { return source && source.sourcePath ? { sourcePath: source.sourcePath, line: Math.max(0, (source.line ?? 1) - 1), character: Math.max(0, (source.column ?? 1) - 1) }"), "Preview should convert Compiler 1-based source coordinates before editor reveal.");
            AssertTrue(html.Contains("function editorSourcePayload(source)"), "Preview should keep editor reveal payloads separate from Compiler source payloads.");
            AssertTrue(html.Contains("character: Math.max(0, (source.character ?? source.column ?? 0))"), "Preview should prefer character and keep column only as fallback.");
            AssertTrue(html.Contains("button.onclick = event => { event.stopPropagation(); openSource(payload); };"), "Preview source button should post the converted editor payload.");
            AssertTrue(html.Contains("character: Math.max(0, (d.column ?? 1) - 1)"), "Preview diagnostics source jump should emit editor character.");
            AssertTrue(html.Contains("pill.onclick = () => openSource(sourcePayload(line.source));"), "Preview metadata source jump should use converted source payload.");
        }

        static void PreviewHtmlStylesQueryInterpolationTokens() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Gold [player.gold].
? Spend [player.gold]?
  - Buy with [player.gold] -> start
""", Encoding.UTF8);

            string html;
            try {
                html = RunCliForOutput(new[] { "preview-project", directory });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(html.Contains(".query-interpolation"), "Preview should style query interpolation tokens.");
            AssertTrue(html.Contains("Content-Security-Policy"), "Preview HTML should include a content security policy.");
            AssertTrue(html.Contains("function appendPreviewText(parent, value)"), "Preview should render text through interpolation-aware fragments.");
            AssertTrue(html.Contains("appendPreviewText(paragraph, line.text);"), "Preview dialogue should use interpolation-aware rendering.");
            AssertTrue(html.Contains("appendPreviewText(prompt, group.prompt);"), "Preview choice prompts should use interpolation-aware rendering.");
            AssertTrue(html.Contains("appendPreviewText(button, option.text);"), "Preview choice options should use interpolation-aware rendering.");
        }

        static void PreviewSourceControllerKeepsColumnFallback() {
            string controller = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Controllers/PreviewSourceController.js"));

            AssertTrue(controller.Contains("const character = Math.max(0, (source.character ?? source.column ?? 0));"), "Preview source controller should prefer character while accepting old column payloads.");
            AssertTrue(controller.Contains("new this.vscode.Range(\n                    line,\n                    character,\n                    line,\n                    character + 1"), "Preview source controller should use normalized editor coordinates.");
        }

        static void PreviewRevealBridgeTrimsChoicePrefixesFromLinkRange() {
            string bridge = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Bridges/PreviewRevealBridge.js"));
            string syncScript = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/DevScripts/PreviewSourceSyncContractCheck.js"));

            AssertTrue(bridge.Contains("const promptRange = this.trimRange(line, choicePromptMatch[1].length, line.length);"), "Choice prompt transient link range should start after the '? ' prefix.");
            AssertTrue(bridge.Contains("const displayRange = this.trimRange(line, optionStart, optionEnd);"), "Choice option transient link range should start after the '- ' prefix.");
            AssertTrue(syncScript.Contains("Choice-option prefix area must not participate in preview reveal hit testing."), "Preview source sync contract should guard option prefix hover behavior.");
            AssertTrue(syncScript.Contains("Choice prompt prefix must not expose transient link range."), "Preview source sync contract should guard prompt prefix hover behavior.");
        }

        static void CliExtractL10nEmitsCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string path = Path.Combine(directory, "story.inscape");
            File.WriteAllText(path, """
# start
Narrator: Hello, "world".
? Choose path
  - Ask again -> second.node

# second.node
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
                exitCode = CliCore.Main(new[] { "extract-l10n", path });
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
# start
@entry
Narrator: Project start.
? Next
  - Continue -> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
# second.node
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
                exitCode = CliCore.Main(new[] { "extract-l10n-project", directory });
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
# start
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
# start
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
# start
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

        static void LocalizationAlignmentAuditReportsReviewStatuses() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
@entry
Narrator: Same line.
Narrator: I waited here a while.
Narrator: Removed line.
Narrator: Shared line A.
Narrator: Shared line B.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T11:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string sameAnchor = AnchorForText(oldCsv, "Same line.");
            string changedAnchor = AnchorForText(oldCsv, "I waited here a while.");
            string removedAnchor = AnchorForText(oldCsv, "Removed line.");
            string sharedFirstAnchor = AnchorForText(oldCsv, "Shared line A.");
            string sharedSecondAnchor = AnchorForText(oldCsv, "Shared line B.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + sameAnchor + ",intro,Dialogue,Narrator,Same line.,Same translation,story/court.inscape,3,1\n"
                + changedAnchor + ",intro,Dialogue,Narrator,I waited here a while.,Changed candidate translation,story/court.inscape,4,1\n"
                + removedAnchor + ",intro,Dialogue,Narrator,Removed line.,Removed translation,story/court.inscape,5,1\n"
                + sharedFirstAnchor + ",intro,Dialogue,Narrator,Shared line A.,Shared first translation,story/court.inscape,6,1\n"
                + sharedSecondAnchor + ",intro,Dialogue,Narrator,Shared line B.,Shared second translation,story/court.inscape,7,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
@entry
Narrator: Same line.
Narrator: I waited here a while longer.
Narrator: Brand new line.
Narrator: Shared line C.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            AssertEqual(1, report.Summary.KeptCount, "Alignment kept count");
            AssertEqual(1, report.Summary.NewCount, "Alignment new count");
            AssertEqual(1, report.Summary.ChangedCount, "Alignment changed count");
            AssertEqual(1, report.Summary.RemovedCount, "Alignment removed count");
            AssertEqual(1, report.Summary.ConflictCount, "Alignment conflict count");
            AssertEqual(3, report.Summary.StaleCount, "Alignment stale count");
            AssertEqual("Same translation", FindAlignmentItem(report, "kept").Translation, "Kept item should carry confirmed translation.");
            AssertEqual("", FindAlignmentItem(report, "changed").Translation, "Changed item should not silently inherit candidate translation.");
            AssertEqual("Changed candidate translation", FindAlignmentItem(report, "changed").Candidates[0].Translation, "Changed item should expose candidate translation.");
            AssertTrue(FindAlignmentItem(report, "changed").Candidates[0].Reason.Contains("same-stable-node", StringComparison.Ordinal), "Changed candidate should explain why it was suggested.");
            AssertEqual(2, FindAlignmentItem(report, "conflict").Candidates.Count, "Conflict item should expose multiple candidates.");
            LocalizationReviewActionPresenterModel diffAction = report.Presenter.Items
                .First(item => item.Item.Status == "changed")
                .Actions
                .First(action => action.ActionKey == "show-candidate-diff");
            AssertTrue(diffAction.Detail.Contains("current: I waited here a while longer.", StringComparison.Ordinal), "Review presenter should expose current text in candidate diff action.");
            AssertTrue(diffAction.Detail.Contains("previous: I waited here a while.", StringComparison.Ordinal), "Review presenter should expose previous candidate text in candidate diff action.");
            AssertTrue(diffAction.Detail.Contains("translation: Changed candidate translation", StringComparison.Ordinal), "Review presenter should expose candidate translation in diff action.");
            AssertTrue(diffAction.Detail.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in diff action.");
            LocalizationReviewActionPresenterModel candidateAction = report.Presenter.Items
                .First(item => item.Item.Status == "changed")
                .Actions
                .First(action => action.ActionKey == "open-candidate");
            AssertTrue(candidateAction.ActionStatus.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in action status.");
            AssertTrue(candidateAction.Detail.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in candidate detail.");
        }

        static void LocalizationAlignmentAuditKeepsLowConfidenceSimilarTextAsConflict() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The lantern still burns tonight.
Narrator: The lantern still shines tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T12:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string firstAnchor = AnchorForText(oldCsv, "The lantern still burns tonight.");
            string secondAnchor = AnchorForText(oldCsv, "The lantern still shines tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + firstAnchor + ",intro,Dialogue,Narrator,The lantern still burns tonight.,Lantern A,story/court.inscape,2,1\n"
                + secondAnchor + ",intro,Dialogue,Narrator,The lantern still shines tonight.,Lantern B,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The lantern still watches tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel conflict = FindAlignmentItem(report, "conflict");
            AssertEqual(0, report.Summary.ChangedCount, "Low-confidence similarity should not produce changed status.");
            AssertEqual(1, report.Summary.ConflictCount, "Low-confidence similarity should produce conflict.");
            AssertEqual(2, conflict.Candidates.Count, "Conflict should keep multiple review candidates.");
            AssertEqual("", conflict.Translation, "Conflict should not fill confirmed translation.");
            LocalizationReviewItemPresenterModel conflictReview = report.Presenter.Items.First(item => item.Item.Status == "conflict");
            AssertTrue(conflictReview.Detail.Contains("<lineIdentity missing>", StringComparison.Ordinal), "Review presenter should expose missing line identity status when no sidecar is available.");
        }

        static void LocalizationAlignmentAuditPrefersNearSequenceWhenSimilarityTies() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha route old.
Narrator: Shared branch line.
Narrator: Filler line.
Narrator: Shared branch line.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T13:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string firstSharedAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string secondSharedAnchor = LastAnchorForText(oldCsv, "Shared branch line.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + firstSharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Near translation,story/court.inscape,3,1\n"
                + secondSharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Far translation,story/court.inscape,5,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha route old.
Narrator: Shared branch line extended.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel conflict = FindAlignmentItem(report, "conflict");
            AssertEqual("Near translation", conflict.Candidates[0].Translation, "Conflict candidates should prefer the nearer sequence match when similarity ties.");
            AssertTrue(conflict.Candidates.Count > 1, "Near sequence tie should keep alternate candidates for review.");
            AssertTrue(conflict.Candidates[0].RankPenalty <= conflict.Candidates[1].RankPenalty, "Preferred candidate should expose a rank penalty that is no worse than later candidates.");
        }

        static void LocalizationAlignmentAuditPrefersNearContextShapeWhenSequenceTies() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask witness about lantern tonight.
Narrator: Ask witness about old ledger records.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T14:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string lanternAnchor = AnchorForText(oldCsv, "Ask witness about lantern tonight.");
            string ledgerAnchor = AnchorForText(oldCsv, "Ask witness about old ledger records.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + lanternAnchor + ",intro,Dialogue,Narrator,Ask witness about lantern tonight.,Lantern context,story/court.inscape,2,1\n"
                + ledgerAnchor + ",intro,Dialogue,Narrator,Ask witness about old ledger records.,Ledger context,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask witness about window tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Lantern context", chosen.Candidates[0].Translation, "Chosen candidate should prefer the nearer context shape when sequence is tied.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-context-shape", StringComparison.Ordinal), "Preferred candidate should record context-shape reason.");
        }

        static void LocalizationAlignmentAuditPrefersKeywordFingerprintWhenContextIsClose() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Review captain incident records tonight.
Narrator: Review witness lantern rumors tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T15:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string recordsAnchor = AnchorForText(oldCsv, "Review captain incident records tonight.");
            string rumorsAnchor = AnchorForText(oldCsv, "Review witness lantern rumors tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + recordsAnchor + ",intro,Dialogue,Narrator,Review captain incident records tonight.,Records context,story/court.inscape,2,1\n"
                + rumorsAnchor + ",intro,Dialogue,Narrator,Review witness lantern rumors tonight.,Rumors context,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Review captain records tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Records context", chosen.Candidates[0].Translation, "Chosen candidate should prefer the closer keyword fingerprint when context shape is similar.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-keyword-fingerprint", StringComparison.Ordinal) || chosen.Candidates[0].Reason.Contains("near-keyword-fingerprint", StringComparison.Ordinal), "Preferred candidate should record keyword fingerprint reason.");
        }

        static void LocalizationAlignmentAuditPrefersNeighborShapeWhenFingerprintIsClose() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Return captain ledger tonight.
Narrator: Return witness ledger tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string captainAnchor = AnchorForText(oldCsv, "Return captain ledger tonight.");
            string witnessAnchor = AnchorForText(oldCsv, "Return witness ledger tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + captainAnchor + ",intro,Dialogue,Narrator,Return captain ledger tonight.,Captain ledger,story/court.inscape,2,1\n"
                + witnessAnchor + ",intro,Dialogue,Narrator,Return witness ledger tonight.,Witness ledger,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Return captain notes tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Captain ledger", chosen.Candidates[0].Translation, "Chosen candidate should prefer the closer neighbor shape when keyword fingerprints are both close.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-neighbor-shape", StringComparison.Ordinal) || chosen.Candidates[0].Reason.Contains("near-neighbor-shape", StringComparison.Ordinal), "Preferred candidate should record neighbor-shape reason.");
        }

        static void LocalizationAlignmentAuditPrefersMatchingLocalContext() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Court context begins.
Narrator: Shared branch line.
Narrator: Court context ends.
Narrator: Archive context begins.
Narrator: Shared branch line.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:30:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string courtBeginAnchor = AnchorForText(oldCsv, "Court context begins.");
            string courtAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string courtEndAnchor = AnchorForText(oldCsv, "Court context ends.");
            string archiveBeginAnchor = AnchorForText(oldCsv, "Archive context begins.");
            string archiveAnchor = LastAnchorForText(oldCsv, "Shared branch line.");
            string archiveEndAnchor = AnchorForText(oldCsv, "Archive context ends.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + courtBeginAnchor + ",intro,Dialogue,Narrator,Court context begins.,Court begin translation,story/court.inscape,2,1\n"
                + courtAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Court translation,story/court.inscape,3,1\n"
                + courtEndAnchor + ",intro,Dialogue,Narrator,Court context ends.,Court end translation,story/court.inscape,4,1\n"
                + archiveBeginAnchor + ",intro,Dialogue,Narrator,Archive context begins.,Archive begin translation,story/court.inscape,5,1\n"
                + archiveAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Archive translation,story/court.inscape,6,1\n"
                + archiveEndAnchor + ",intro,Dialogue,Narrator,Archive context ends.,Archive end translation,story/court.inscape,7,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context begins.
Narrator: Shared branch line extended.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Archive translation", chosen.Candidates[0].Translation, "Chosen candidate should prefer the matching surrounding localization context.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-local-context", StringComparison.Ordinal), "Preferred candidate should record local context reason.");
        }

        static void LocalizationAlignmentAuditRecordsNearLocalContext() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context begins.
Narrator: Shared branch line.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:45:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string beginAnchor = AnchorForText(oldCsv, "Archive context begins.");
            string sharedAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string endAnchor = AnchorForText(oldCsv, "Archive context ends.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + beginAnchor + ",intro,Dialogue,Narrator,Archive context begins.,Archive begin translation,story/court.inscape,2,1\n"
                + sharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Shared translation,story/court.inscape,3,1\n"
                + endAnchor + ",intro,Dialogue,Narrator,Archive context ends.,Archive end translation,story/court.inscape,4,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context opens.
Narrator: Shared branch line extended.
Narrator: Archive context closes.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindAlignmentItemByText(report, "Shared branch line extended.", "changed", "conflict");
            AssertEqual("Shared translation", chosen.Candidates[0].Translation, "Chosen candidate should keep using surrounding context when neighboring lines are lightly rewritten.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("near-local-context", StringComparison.Ordinal), "Preferred candidate should record near local context reason.");
        }

        static void LocalizationAlignmentAuditUsesLineSidecarIdentity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: Ask clerk about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string guardAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string clerkAnchor = AnchorForText(oldCsv, "Ask clerk about lantern tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + guardAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard translation,story/court.inscape,2,1\n"
                + clerkAnchor + ",intro,Dialogue,Narrator,Ask clerk about lantern tonight.,Clerk translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about records tonight.
Narrator: Ask clerk about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual("Guard translation", changed.Candidates[0].Translation, "Line sidecar identity should keep the changed line paired with its previous translation candidate.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Preferred candidate should record line identity reason.");
            AssertEqual(changed.LineId, changed.Candidates[0].LineId, "Current item and preferred candidate should share the same line id.");
            AssertTrue(!string.IsNullOrWhiteSpace(changed.LineFingerprint), "Current item should expose line fingerprint for review.");
            AssertTrue(!string.IsNullOrWhiteSpace(changed.Candidates[0].LineFingerprint), "Candidate item should expose line fingerprint for review.");
            LocalizationReviewItemPresenterModel reviewItem = report.Presenter.Items.First(item => item.Item.Status == "changed");
            AssertTrue(reviewItem.Detail.Contains("<line " + changed.LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose current line identity status in item detail.");
            AssertTrue(reviewItem.Detail.Contains("fp " + changed.LineFingerprint.Substring(0, Math.Min(changed.LineFingerprint.Length, 12)), StringComparison.Ordinal), "Review presenter should expose current line fingerprint in item detail.");
            LocalizationReviewActionPresenterModel candidateAction = reviewItem.Actions.First(action => action.ActionKey == "open-candidate");
            AssertTrue(candidateAction.ActionStatus.Contains("line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose candidate line identity status in action status.");
            AssertTrue(candidateAction.Detail.Contains("<line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose candidate line identity status in action detail.");
            AssertTrue(candidateAction.Detail.Contains("fp " + changed.Candidates[0].LineFingerprint.Substring(0, Math.Min(changed.Candidates[0].LineFingerprint.Length, 12)), StringComparison.Ordinal), "Review presenter should expose candidate line fingerprint in action detail.");
            LocalizationReviewActionPresenterModel diffAction = reviewItem.Actions.First(action => action.ActionKey == "show-candidate-diff");
            AssertTrue(diffAction.Detail.Contains("<line " + changed.LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff should expose current line identity status.");
            AssertTrue(diffAction.Detail.Contains("<line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff should expose candidate line identity status.");
        }

        static void LocalizationAlignmentAuditResolvesCloseCandidatesByLineIdentity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: Ask guard about lantern tonight!
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:15:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string stableAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string closeAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight!");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + stableAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Stable line translation,story/court.inscape,2,1\n"
                + closeAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight!,Close text translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight?
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual(1, changed.Candidates.Count, "Exact line identity should prune close text-only candidates from the changed item.");
            AssertEqual("Stable line translation", changed.Candidates[0].Translation, "Exact line identity should resolve close text candidates to the stable line.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Resolved candidate should record exact line identity reason.");
        }

        static void LocalizationAlignmentAuditKeepsRewrittenSameLineCandidate() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:30:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string anchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + anchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard lantern translation,story/court.inscape,2,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The verdict changes everything.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual("", changed.Translation, "Rewritten line should still require review instead of inheriting the translation.");
            AssertEqual("Guard lantern translation", changed.Candidates[0].Translation, "Exact line identity should keep the previous translation as a review candidate even when text similarity is low.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Rewritten same-line candidate should record exact line identity reason.");
        }

        static void LocalizationAlignmentAuditRanksExactLineIdentityBeforeTextSimilarity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: The verdict changes tomorrow.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:45:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string lineAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string similarAnchor = AnchorForText(oldCsv, "The verdict changes tomorrow.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + lineAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Exact line translation,story/court.inscape,2,1\n"
                + similarAnchor + ",intro,Dialogue,Narrator,The verdict changes tomorrow.,Similar text translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The verdict changes everything.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual(1, changed.Candidates.Count, "Exact line identity should prune higher-similarity text-only candidates.");
            AssertEqual("Exact line translation", changed.Candidates[0].Translation, "Exact line identity should rank before a higher text-similarity candidate from another line.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Preferred candidate should record exact line identity reason.");
        }

        static void CliAuditL10nAlignmentProjectEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "story.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Hello.
""", Encoding.UTF8);
            RunCliForOutput(new[] { "update-node-map-project", directory });
            string initialCsv = RunCliForOutput(new[] { "extract-l10n-project", directory });
            string anchor = FirstDataAnchor(initialCsv);
            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",intro,Dialogue,Narrator,Hello.,Hello translation,story.inscape,3,1\n",
                              Encoding.UTF8);

            string json;
            try {
                json = RunCliForOutput(new[] { "audit-l10n-alignment-project", directory, "--from", oldCsvPath });
            } finally {
                Directory.Delete(directory, true);
            }

            using JsonDocument document = JsonDocument.Parse(json);
            JsonElement root = document.RootElement;
            AssertEqual("inscape.localization-alignment", root.GetProperty("format").GetString(), "Alignment CLI format");
            AssertEqual(1, root.GetProperty("summary").GetProperty("keptCount").GetInt32(), "Alignment CLI kept count");
            AssertEqual("Hello translation", root.GetProperty("items")[0].GetProperty("translation").GetString(), "Alignment CLI should preserve kept translation.");
            AssertTrue(root.GetProperty("items")[0].GetProperty("candidates").GetArrayLength() > 0, "Alignment CLI kept item should keep previous candidate trace.");
        }

        static void CliAuditL10nAlignmentProjectEmitsText() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "story.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Hello there.
""", Encoding.UTF8);
            RunCliForOutput(new[] { "update-node-map-project", directory });
            string initialCsv = RunCliForOutput(new[] { "extract-l10n-project", directory });
            string anchor = FirstDataAnchor(initialCsv);
            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",intro,Dialogue,Narrator,Hello there.,Localized hello,story.inscape,3,1\n",
                              Encoding.UTF8);

            string text;
            try {
                text = RunCliForOutput(new[] { "audit-l10n-alignment-project", directory, "--from", oldCsvPath, "--format", "text" });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(text.Contains("Localization alignment audit:"), "Alignment text report should include title.");
            AssertTrue(text.Contains("kept intro Dialogue"), "Alignment text report should list kept item summary.");
            AssertTrue(text.Contains("translation: Localized hello"), "Alignment text report should include confirmed translation.");
            AssertTrue(text.Contains("[rankPenalty 0]"), "Alignment text report should expose candidate rank penalty.");
            AssertTrue(text.Contains("Summary: kept 1, new 0, changed 0, removed 0, conflict 0, stale 0."), "Alignment text report should include summary line.");
        }

        static void CliAuditL10nAlignmentProjectReportsLineIdentityStatus() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "story.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Ask guard about lantern tonight.
""", Encoding.UTF8);
            RunCliForOutput(new[] { "update-node-map-project", directory });
            RunCliForOutput(new[] { "refresh-l10n-line-map-project", directory });
            string initialCsv = RunCliForOutput(new[] { "extract-l10n-project", directory });
            string anchor = FirstDataAnchor(initialCsv);
            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard translation,story.inscape,3,1\n",
                              Encoding.UTF8);

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Ask guard about records tonight.
""", Encoding.UTF8);
            RunCliForOutput(new[] { "refresh-l10n-line-map-project", directory });

            string json;
            try {
                json = RunCliForOutput(new[] { "audit-l10n-alignment-project", directory, "--from", oldCsvPath });
            } finally {
                Directory.Delete(directory, true);
            }

            using JsonDocument document = JsonDocument.Parse(json);
            JsonElement root = document.RootElement;
            AssertEqual("available", root.GetProperty("lineIdentity").GetProperty("status").GetString(), "Alignment report should expose available line identity status.");
            JsonElement candidate = root.GetProperty("items")[0].GetProperty("candidates")[0];
            AssertTrue(candidate.GetProperty("reason").GetString()!.Contains("same-line-id", StringComparison.Ordinal), "Alignment candidate should include line identity reason.");
            AssertTrue(candidate.TryGetProperty("rankPenalty", out JsonElement rankPenalty) && rankPenalty.GetInt32() >= 0, "Alignment candidate should expose rank penalty for review ordering.");
            AssertTrue(!string.IsNullOrWhiteSpace(candidate.GetProperty("lineId").GetString()), "Alignment candidate should expose line id.");
        }

        static void CliAuditL10nAlignmentProjectReportsLineIdentityDrift() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "story.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Ask guard about lantern tonight.
""", Encoding.UTF8);
            RunCliForOutput(new[] { "update-node-map-project", directory });
            RunCliForOutput(new[] { "refresh-l10n-line-map-project", directory });
            string initialCsv = RunCliForOutput(new[] { "extract-l10n-project", directory });
            string anchor = FirstDataAnchor(initialCsv);
            File.WriteAllText(oldCsvPath,
                              "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                              + anchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard translation,story.inscape,3,1\n",
                              Encoding.UTF8);

            File.WriteAllText(storyPath, """
# intro
@entry
Narrator: Ask guard about records tonight.
""", Encoding.UTF8);

            string json;
            try {
                json = RunCliForOutput(new[] { "audit-l10n-alignment-project", directory, "--from", oldCsvPath });
            } finally {
                Directory.Delete(directory, true);
            }

            using JsonDocument document = JsonDocument.Parse(json);
            JsonElement root = document.RootElement;
            AssertEqual("drift", root.GetProperty("lineIdentity").GetProperty("status").GetString(), "Alignment report should expose drift status when sidecar is stale.");
            AssertTrue(root.GetProperty("lineIdentity").GetProperty("hasDrift").GetBoolean(), "Alignment report should expose hasDrift flag.");
            JsonElement candidate = root.GetProperty("items")[0].GetProperty("candidates")[0];
            AssertFalse(candidate.GetProperty("reason").GetString()!.Contains("same-line-id", StringComparison.Ordinal), "Drifted sidecar should not feed line identity scoring.");
        }

        static void CliRefreshLocalizationLineStateEmitsRefreshResultJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            try {
                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# intro
@entry
Narrator: Hello.
""", Encoding.UTF8);

                string reportPath = Path.Combine(directory, "refresh-report.json");
                string output = RunCliForOutput(new[] { "refresh-l10n-line-map-project", directory, "--report", reportPath });
                AssertTrue(output.Contains("inscape.line-map.json"), "Line refresh command should print the line map path.");

                using JsonDocument report = JsonDocument.Parse(File.ReadAllText(reportPath, Encoding.UTF8));
                JsonElement root = report.RootElement;
                AssertTrue(root.TryGetProperty("report", out JsonElement reportProperty), "Line refresh report output should contain nested report object.");
                AssertTrue(root.TryGetProperty("status", out JsonElement statusProperty), "Line refresh report output should contain status object.");
                AssertEqual("inscape.localization-line-refresh", reportProperty.GetProperty("format").GetString(), "Nested line refresh report should preserve format.");
                AssertTrue(statusProperty.TryGetProperty("hasDrift", out _), "Status object should expose drift flag.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void LocalizationLineMapRefreshTracksChangedAddedAndRemovedLines() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            AssertEqual(1, firstRefresh.LineMap.Documents.Count, "First line map refresh should create document entry.");
            AssertEqual(2, firstRefresh.LineMap.Documents[0].Blocks[0].Lines.Count, "First line map refresh should capture block lines.");

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha changed.
Narrator: Gamma.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            LocalizationLineRefreshBlockModel block = refresh.Report.Blocks[0];
            AssertEqual(2, block.Changes.Count, "Refresh should report one changed line and one changed-by-replacement line under simple rules.");
            AssertEqual("changed", block.Changes[0].Kind, "First refresh change should be changed.");
            AssertEqual("Alpha.", block.Changes[0].OldText, "Changed line should preserve old text.");
            AssertEqual("Alpha changed.", block.Changes[0].NewText, "Changed line should preserve new text.");
            AssertTrue(block.Changes[0].Summary.Contains("changed line"), "Changed line should include summary text.");
            AssertEqual("changed", block.Changes[1].Kind, "Second line replacement should be represented as changed in first-pass rules.");
        }

        static void ToolConfigResolvesLocalizationLineMapPath() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string configPath = Path.Combine(directory, "inscape.config.json");
            File.WriteAllText(configPath,
                              """
{
  "localization": {
    "lineMap": "artifacts/inscape.line-map.json"
  }
}
""",
                              Encoding.UTF8);

            try {
                JsonSerializerOptions jsonOptions = new JsonSerializerOptions {
                    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                };
                jsonOptions.Converters.Add(new JsonStringEnumConverter());
                bool ok = ToolConfigReaderDomain.TryReadProjectConfig(directory, null, jsonOptions, out ToolConfigModel config, out string? errorMessage);
                AssertTrue(ok, "Tool config should read localization line map path.");
                AssertEqual(null, errorMessage, "Tool config should not report localization line map error.");
                AssertEqual(Path.Combine(directory, "artifacts", "inscape.line-map.json"), config.Localization.LineMap, "Localization line map path should resolve relative to config.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void LocalizationLineMapWriterCreatesBackupAndRestoresIt() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string lineMapPath = Path.Combine(directory, "inscape.line-map.json");
            JsonSerializerOptions jsonOptions = new JsonSerializerOptions {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            jsonOptions.Converters.Add(new JsonStringEnumConverter());

            try {
                LocalizationLineMapWriterDomain.Write(lineMapPath, new LocalizationLineMapModel {
                    Documents = new List<LocalizationLineMapDocumentModel> {
                        new LocalizationLineMapDocumentModel {
                            SourcePath = "story/court.inscape"
                        }
                    }
                }, jsonOptions);

                LocalizationLineMapWriterDomain.Write(lineMapPath, new LocalizationLineMapModel {
                    Documents = new List<LocalizationLineMapDocumentModel>()
                }, jsonOptions);

                AssertTrue(File.Exists(lineMapPath + ".backup"), "Line map writer should create backup file before overwrite.");
                bool restored = LocalizationLineMapWriterDomain.TryRestoreBackup(lineMapPath);
                AssertTrue(restored, "Line map writer should restore backup file when requested.");

                bool ok = LocalizationLineMapReaderDomain.TryRead(lineMapPath, jsonOptions, out LocalizationLineMapModel restoredMap, out string? errorMessage);
                AssertTrue(ok, "Restored line map should be readable.");
                AssertEqual(null, errorMessage, "Restored line map should not report error.");
                AssertEqual(1, restoredMap.Documents.Count, "Restored line map should bring back previous document entry.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void LocalizationLineMapRefreshStoresSourceFingerprint() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            AssertTrue(!string.IsNullOrWhiteSpace(refresh.LineMap.LastSourceFingerprint), "Line map refresh should store source fingerprint for drift detection.");
        }

        static void LocalizationLineMapRefreshReportsDriftWhenFingerprintChanged() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            firstRefresh.LineMap.LastSourceFingerprint = "stale-fingerprint";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha changed.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            AssertTrue(refresh.Status.HasDrift, "Line refresh should report drift when the stored source fingerprint no longer matches the refreshed content.");
            AssertTrue(!string.IsNullOrWhiteSpace(refresh.Status.Message), "Drift status should include a warning message.");
            AssertTrue(!string.IsNullOrWhiteSpace(refresh.Status.Recommendation), "Drift status should include a recommendation for the operator.");
        }

        static void LocalizationLineMapRefreshTreatsInsertedMiddleLineAsAdded() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Gamma.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
Narrator: Gamma.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            LocalizationLineRefreshBlockModel block = refresh.Report.Blocks[0];
            AssertEqual(1, block.Changes.Count, "Inserted middle line should report one added change.");
            AssertEqual("added", block.Changes[0].Kind, "Inserted middle line should be represented as added.");
            AssertEqual("Beta.", block.Changes[0].NewText, "Inserted middle line should preserve new text.");
        }

        static void LocalizationLineMapRefreshTreatsDeletedMiddleLineAsRemoved() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
Narrator: Gamma.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Gamma.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            LocalizationLineRefreshBlockModel block = refresh.Report.Blocks[0];
            AssertEqual(1, block.Changes.Count, "Deleted middle line should report one removed change.");
            AssertEqual("removed", block.Changes[0].Kind, "Deleted middle line should be represented as removed.");
            AssertEqual("Beta.", block.Changes[0].OldText, "Removed middle line should preserve old text.");
        }

        static void LocalizationLineMapRefreshKeepsFirstLineIdWhenSplittingLine() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha and Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string originalLineId = firstRefresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId;

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            AssertEqual(originalLineId, refresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId, "Split line should keep the first line id on the first resulting line.");
        }

        static void LocalizationLineMapRefreshKeepsFirstLineIdWhenMergingLines() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string originalLineId = firstRefresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId;

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            AssertEqual(originalLineId, refresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId, "Merged line should keep the first original line id.");
        }

        static void LocalizationLineMapRefreshKeepsStableIdsForDuplicateNeighborLines() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Repeat.
Narrator: Repeat.
Narrator: Tail.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string firstLineId = firstRefresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId;
            string secondLineId = firstRefresh.LineMap.Documents[0].Blocks[0].Lines[1].LineId;

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Repeat.
Narrator: Repeat changed.
Narrator: Tail.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            AssertEqual(firstLineId, refresh.LineMap.Documents[0].Blocks[0].Lines[0].LineId, "First duplicate line should keep its stable id.");
            AssertEqual(secondLineId, refresh.LineMap.Documents[0].Blocks[0].Lines[1].LineId, "Second duplicate line should keep its stable id when changed in place.");
        }

        static void LocalizationLineMapRefreshTreatsComplexReplacementAsAddAndRemove() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha.
Narrator: Beta.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
? Choose.
- Option A -> next
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");
            LocalizationLineRefreshBlockModel block = refresh.Report.Blocks[0];
            AssertEqual(4, block.Changes.Count, "Complex replacement should produce remove/remove/add/add under first-pass conservative rules.");
            AssertEqual(2, block.Changes.Count((change) => change.Kind == "removed"), "Complex replacement should remove the two old lines.");
            AssertEqual(2, block.Changes.Count((change) => change.Kind == "added"), "Complex replacement should add the two new lines.");
        }

        static void VSCodeLocalizationCommandExposesReviewAlignmentEntry() {
            string commandSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Commands/LocalizationCommand.js"));
            string reviewControllerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Controllers/LocalizationReviewController.js"));
            string toolingPresenterBuilderSource = File.ReadAllText(RepositoryFile("src/Internal/Tooling/Localization/Domains/LocalizationReviewPresenterModelBuilderDomain.cs"));
            string quickPickAdapterSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/ViewModels/LocalizationReviewQuickPickAdapter.js"));
            string toolsMenuSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/EditorAuthoring/Commands/EditorAuthoringCommand.js"));
            string nodeMapReviewControllerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/EditorAuthoring/Controllers/StoryNodeMapReviewController.js"));
            string extensionSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/ExtensionManifestEntry.js"));
            string registrationSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Entries/ExtensionRegistrationController.js"));
            string packageJson = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/package.json"));

            AssertTrue(commandSource.Contains("async reviewAlignment(context)"), "Localization command should expose reviewAlignment entrypoint.");
            AssertTrue(commandSource.Contains("audit-l10n-alignment-project"), "Localization command review should invoke alignment audit CLI.");
            AssertTrue(commandSource.Contains("--format"), "Localization command review should allow choosing output format.");
            AssertTrue(commandSource.Contains("this.localizationReviewController.reviewAlignmentReport(options.outputPath)"), "Localization command should delegate report review UI to a narrower controller.");
            AssertTrue(commandSource.Contains("async handleSuccessSelection(selection, options)"), "Localization command should isolate post-success selection dispatch from CLI invocation flow.");
            AssertTrue(commandSource.Contains("Review Items"), "Localization command should offer quick review action for json report.");
            AssertTrue(reviewControllerSource.Contains("async reviewAlignmentReport(reportPath)"), "Localization review controller should expose interactive report review entrypoint.");
            AssertTrue(reviewControllerSource.Contains("const presenter = this.buildPresenter(report);"), "Localization review controller should consume presenter model from report payload.");
            AssertTrue(reviewControllerSource.Contains("this.localizationReviewQuickPickAdapter.createQuickPickItems(presenter.Items)"), "Localization review controller should keep QuickPick adaptation local to VSCode UI.");
            AssertTrue(reviewControllerSource.Contains("this.localizationReviewQuickPickAdapter.createQuickPickItems(itemModel.Actions)"), "Localization review controller should adapt presenter actions through the QuickPick adapter.");
            AssertTrue(reviewControllerSource.Contains("show-candidate-diff"), "Localization review controller should expose presenter-provided candidate diff actions.");
            AssertTrue(toolingPresenterBuilderSource.Contains("public static LocalizationReviewPresenterModel Build"), "Localization review presenter model builder should now live in Tooling.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"open-current\""), "Tooling presenter model builder should encode action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"open-candidate\""), "Tooling presenter model builder should encode candidate action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"show-candidate-diff\""), "Tooling presenter model builder should encode candidate diff action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildRankPenaltySummary(candidate)"), "Tooling presenter model builder should expose rank penalty summaries for review UI.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildCandidateLineStatus(candidate)"), "Tooling presenter model builder should expose candidate line identity in action status.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint)"), "Tooling presenter model builder should expose candidate line identity status summaries for review UI.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildLineFingerprintSummary(fingerprint)"), "Tooling presenter model builder should expose line fingerprint summaries for review UI.");
            AssertTrue(quickPickAdapterSource.Contains("createQuickPickLabel(model)"), "QuickPick adapter should own VSCode-facing action label mapping.");
            AssertTrue(quickPickAdapterSource.Contains("Compare candidate "), "QuickPick adapter should own VSCode-facing candidate diff labels.");
            AssertTrue(reviewControllerSource.Contains("openLocation(this.locationFromPayload(selected.location))"), "Localization review controller should jump to source location.");
            AssertTrue(extensionSource.Contains("new LocalizationReviewQuickPickAdapter()"), "Extension entry should assemble a separate QuickPick adapter for VSCode label mapping.");
            AssertTrue(extensionSource.Contains("const locationServices = {"), "Extension entry should centralize repeated location service injection.");
            AssertTrue(extensionSource.Contains("const openFileInEditor = async (filePath) => {"), "Extension entry should centralize repeated file-open glue.");
            AssertTrue(extensionSource.Contains("...locationServices"), "Extension entry should reuse grouped location services across controllers and commands.");
            AssertTrue(toolsMenuSource.Contains("审查本地化对齐候选"), "Tools menu should expose localization alignment review action.");
            AssertTrue(toolsMenuSource.Contains("await this.handleNodeMapSelection(selection, {"), "Editor authoring command should route node map success flow through a dedicated handler.");
            AssertTrue(toolsMenuSource.Contains("this.storyNodeMapReviewController"), "Editor authoring command should depend on a narrower node map review controller.");
            AssertTrue(toolsMenuSource.Contains("async handleNodeMapSelection(selection, options)"), "Editor authoring command should isolate node map success selection dispatch from invocation flow.");
            AssertTrue(toolsMenuSource.Contains("Review Items"), "Editor authoring command should expose review items action for node map report.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async reviewNodeMapReport(report, nodeMapPath, reportPath)"), "Story node map review controller should expose review entrypoint.");
            AssertTrue(nodeMapReviewControllerSource.Contains("createNodeMapReviewActions(item, nodeMapPath, reportPath)"), "Story node map review controller should expose candidate-specific node map actions.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Apply candidate "), "Story node map review controller should expose explicit apply action for manual-review candidates.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Preview candidate "), "Story node map review controller should expose explicit dry-run preview for manual-review candidates.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async applyCandidateStableId(nodeMapPath, item, candidate)"), "Story node map review controller should support applying a reviewed stable id choice.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async previewCandidateStableId(nodeMapPath, item, candidate)"), "Story node map review controller should support dry-run preview for a reviewed stable id choice.");
            AssertTrue(nodeMapReviewControllerSource.Contains("applyCandidateStableIdToNodeMap(nodeMap, item, candidate)"), "Story node map review controller should centralize the node map mutation logic for preview/apply flows.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Revert last applied stable id"), "Story node map review controller should expose a revert action for the last applied stable id.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async revertLastAppliedStableId(nodeMapPath)"), "Story node map review controller should support reverting the last applied stable id change.");
            AssertTrue(nodeMapReviewControllerSource.Contains("reviewBackupPath(nodeMapPath)"), "Story node map review controller should keep a review backup path helper for apply/revert flow.");
            AssertTrue(registrationSource.Contains("inscape.reviewLocalizationAlignment"), "Extension registration should register localization alignment review command.");
            AssertTrue(packageJson.Contains("\"command\": \"inscape.reviewLocalizationAlignment\""), "VSCode package should contribute localization alignment review command.");
            AssertTrue(packageJson.Contains("\"command\": \"inscape.refreshLocalizationLineState\""), "VSCode package should contribute localization line refresh command.");
            AssertTrue(packageJson.Contains("\"debug\""), "VSCode package should add debug source sync mode.");
            AssertTrue(commandSource.Contains("refresh-l10n-line-map-project"), "Localization command should invoke localization line refresh CLI command.");
            AssertTrue(commandSource.Contains("Show Summary"), "Localization command should expose a line refresh summary action.");
            AssertTrue(commandSource.Contains("async showLineRefreshSummary(reportPath)"), "Localization command should summarize line refresh changes for the user.");
            AssertTrue(commandSource.Contains("Show Details"), "Localization command should expose a detailed line refresh review action.");
            AssertTrue(commandSource.Contains("async showLineRefreshDetails(reportPath)"), "Localization command should expose detailed line refresh picks.");
            AssertTrue(commandSource.Contains("async openLineRefreshChange(selection, reportPath)"), "Localization command should support jumping from line refresh details to source.");
            AssertTrue(commandSource.Contains("handleLineMapDriftDecision(report, reportPath"), "Localization command should route drift detection through an explicit decision flow.");
            AssertTrue(commandSource.Contains("\"Continue\""), "Localization command should offer a continue action when line map drift is detected.");
            AssertTrue(commandSource.Contains("\"Restore Backup\""), "Localization command should offer restore backup action when line map drift is detected.");
            AssertTrue(commandSource.Contains("report.status.recommendation"), "Localization command should surface drift recommendations along with the warning.");
            AssertTrue(extensionSource.Contains("isDebugSourceSyncMode"), "Extension entry should expose debug source sync mode helper.");
            AssertTrue(extensionSource.Contains("new LocalizationLineMapDebugController({"), "Extension entry should assemble localization line map debug controller.");
            string hoverSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/DslScript/Providers/DslScriptHoverProvider.js"));
            string debugSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Controllers/LocalizationLineMapDebugController.js"));
            AssertTrue(debugSource.Contains("blockId:"), "Debug hover should expose blockId metadata from line sidecar.");
            AssertTrue(debugSource.Contains("lineId:"), "Debug hover should expose lineId metadata from line sidecar.");
            AssertTrue(debugSource.Contains("kind:"), "Debug hover should expose kind metadata from line sidecar.");
            AssertTrue(debugSource.Contains("speaker:"), "Debug hover should expose speaker metadata from line sidecar when present.");
            AssertTrue(debugSource.Contains("this.fs.promises.stat(lineMapPath)"), "Debug hover should stat the line sidecar before using cached data.");
            AssertTrue(debugSource.Contains("cached.mtimeMs === stat.mtimeMs"), "Debug hover line sidecar cache should invalidate when the sidecar mtime changes.");
            AssertTrue(debugSource.Contains("this.cache.delete(cacheKey)"), "Debug hover line sidecar cache should recover when a missing sidecar later appears.");
            AssertTrue(hoverSource.Contains("localizationLineMapDebugController.tryCreateHover(document, position)"), "DslScript hover provider should delegate debug hover to line sidecar controller.");
        }

        static void PreviewHtmlProviderAddsCspToFallbackPages() {
            string providerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Providers/PreviewHtmlProvider.js"));

            AssertTrue(providerSource.Contains("Content-Security-Policy"), "Preview HTML provider should add CSP to loading and error pages.");
            AssertTrue(providerSource.Contains("default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"), "Preview HTML provider should use restrictive fallback CSP.");
        }

        static LocalizationAlignmentItemModel FindAlignmentItem(LocalizationAlignmentReportModel report, string status) {
            for (int i = 0; i < report.Items.Count; i += 1) {
                if (report.Items[i].Status == status) {
                    return report.Items[i];
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + status);
        }

        static LocalizationAlignmentItemModel FindFirstAlignmentItem(LocalizationAlignmentReportModel report, params string[] statuses) {
            for (int statusIndex = 0; statusIndex < statuses.Length; statusIndex += 1) {
                string status = statuses[statusIndex];
                for (int i = 0; i < report.Items.Count; i += 1) {
                    if (report.Items[i].Status == status) {
                        return report.Items[i];
                    }
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + string.Join(",", statuses));
        }

        static LocalizationAlignmentItemModel FindAlignmentItemByText(LocalizationAlignmentReportModel report, string text, params string[] statuses) {
            for (int statusIndex = 0; statusIndex < statuses.Length; statusIndex += 1) {
                string status = statuses[statusIndex];
                for (int i = 0; i < report.Items.Count; i += 1) {
                    if (report.Items[i].Status == status && report.Items[i].Text == text) {
                        return report.Items[i];
                    }
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + text);
        }

        static string AnchorForText(string csv, string text) {
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Contains(text, StringComparison.Ordinal)) {
                    int comma = line.IndexOf(',');
                    return comma < 0 ? line : line.Substring(0, comma);
                }
            }

            throw new InvalidOperationException("Could not find CSV text: " + text);
        }

        static string LastAnchorForText(string csv, string text) {
            string result = string.Empty;
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Contains(text, StringComparison.Ordinal)) {
                    int comma = line.IndexOf(',');
                    result = comma < 0 ? line : line.Substring(0, comma);
                }
            }

            if (string.IsNullOrWhiteSpace(result)) {
                throw new InvalidOperationException("Could not find CSV text: " + text);
            }

            return result;
        }
    }
}
