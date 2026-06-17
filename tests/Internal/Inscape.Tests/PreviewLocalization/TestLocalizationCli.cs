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
                              + anchor + ",start,Dialogue,Narrator,Hello.,你好,old.inscape,2,1\n"
                              + "l1_removed,old.node,Narration,,Removed.,旧译文,old.inscape,8,1\n",
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
            AssertTrue(csv.Contains("你好,current"), "Updated CSV should preserve existing translation.");
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


        static void CliUpdateL10nProjectAppliesTranslationOverrides() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "00-start.inscape");
            string oldCsvPath = Path.Combine(directory, "old.csv");
            string overridesPath = Path.Combine(directory, "overrides.json");

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
            File.WriteAllText(overridesPath,
                              "[\n"
                              + "  {\n"
                              + "    \"anchor\": \"" + anchor + "\",\n"
                              + "    \"translation\": \"Edited translation\"\n"
                              + "  }\n"
                              + "]\n",
                              Encoding.UTF8);

            string csv;
            try {
                csv = RunCliForOutput(new[] {
                    "update-l10n-project",
                    directory,
                    "--from",
                    oldCsvPath,
                    "--translation-overrides",
                    overridesPath,
                });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(csv.Contains("Edited translation,current"), "Project update should apply translation overrides before merge.");
            AssertFalse(csv.Contains("Project translation,current"), "Project update should not keep the old translation when an override is present.");
        }


        static void CliUpdateL10nProjectRejectsNonLocalizationCsv() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string storyPath = Path.Combine(directory, "00-start.inscape");
            string hostConfigCsvPath = Path.Combine(directory, "host-config.csv");

            File.WriteAllText(storyPath, """
# start
@entry
Narrator: Project start.
""", Encoding.UTF8);
            File.WriteAllText(hostConfigCsvPath,
                              "query,returnType,description\n"
                              + "player.name,string,Host config row\n",
                              Encoding.UTF8);

            (int exitCode, string stdout, string stderr) result;
            try {
                result = RunCliForFailure(new[] {
                    "update-l10n-project",
                    directory,
                    "--from",
                    hostConfigCsvPath,
                });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertEqual("", result.stdout.Trim(), "Rejected localization update should not emit CSV stdout.");
            AssertTrue(result.stderr.Contains("Previous localization CSV must include anchor and translation columns", StringComparison.Ordinal), "Project update should reject host config CSV before producing updated localization output.");
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

    }
}
