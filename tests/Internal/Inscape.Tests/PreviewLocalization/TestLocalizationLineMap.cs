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

    }
}
