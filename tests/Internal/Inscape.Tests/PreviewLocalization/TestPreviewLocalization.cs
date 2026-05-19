using System.Text;
using System.Text.Json;
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
            string controller = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Preview/Controllers/PreviewSourceController.js"));

            AssertTrue(controller.Contains("const character = Math.max(0, (source.character ?? source.column ?? 0));"), "Preview source controller should prefer character while accepting old column payloads.");
            AssertTrue(controller.Contains("new this.vscode.Range(\n                    line,\n                    character,\n                    line,\n                    character + 1"), "Preview source controller should use normalized editor coordinates.");
        }

        static void PreviewRevealBridgeTrimsChoicePrefixesFromLinkRange() {
            string bridge = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Preview/Bridges/PreviewRevealBridge.js"));
            string syncScript = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/check-preview-source-sync-modes.js"));

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
            AssertTrue(text.Contains("Summary: kept 1, new 0, changed 0, removed 0, conflict 0, stale 0."), "Alignment text report should include summary line.");
        }

        static void VSCodeLocalizationCommandExposesReviewAlignmentEntry() {
            string commandSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Localization/Commands/LocalizationCommand.js"));
            string toolsMenuSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/EditorAuthoring/Commands/EditorAuthoringCommand.js"));
            string registrationSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Entries/ExtensionRegistrationController.js"));
            string packageJson = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/package.json"));

            AssertTrue(commandSource.Contains("async reviewAlignment(context)"), "Localization command should expose reviewAlignment entrypoint.");
            AssertTrue(commandSource.Contains("audit-l10n-alignment-project"), "Localization command review should invoke alignment audit CLI.");
            AssertTrue(commandSource.Contains("--format"), "Localization command review should allow choosing output format.");
            AssertTrue(commandSource.Contains("async reviewAlignmentReport(reportPath)"), "Localization command should expose interactive report review entrypoint.");
            AssertTrue(commandSource.Contains("Review Items"), "Localization command should offer quick review action for json report.");
            AssertTrue(commandSource.Contains("createCandidateActionItems(item)"), "Localization command should expose candidate review actions.");
            AssertTrue(commandSource.Contains("Jump to current line"), "Localization command should let review flow jump back to current text.");
            AssertTrue(commandSource.Contains("Candidate "), "Localization command should expose candidate-specific jump actions.");
            AssertTrue(commandSource.Contains("openLocation(this.locationFromPayload(selected.location))"), "Localization command review should jump to source location.");
            AssertTrue(toolsMenuSource.Contains("审查本地化对齐候选"), "Tools menu should expose localization alignment review action.");
            AssertTrue(toolsMenuSource.Contains("async reviewNodeMapReport(report, nodeMapPath, reportPath)"), "Editor authoring command should expose node map report review entrypoint.");
            AssertTrue(toolsMenuSource.Contains("Review Items"), "Editor authoring command should expose review items action for node map report.");
            AssertTrue(toolsMenuSource.Contains("createNodeMapReviewActions(item, nodeMapPath, reportPath)"), "Editor authoring command should expose candidate-specific node map actions.");
            AssertTrue(registrationSource.Contains("inscape.reviewLocalizationAlignment"), "Extension registration should register localization alignment review command.");
            AssertTrue(packageJson.Contains("\"command\": \"inscape.reviewLocalizationAlignment\""), "VSCode package should contribute localization alignment review command.");
        }

        static void PreviewHtmlProviderAddsCspToFallbackPages() {
            string providerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Preview/Providers/PreviewHtmlProvider.js"));

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
