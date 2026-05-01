using System.Text;
using System.Text.Json;
using Inscape.Core.Analysis;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using CliProgram = Inscape.Cli.Program;

namespace Inscape.Tests {

    public static partial class Program {

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
102,鏂板婧愭枃鏈?,,
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
    }
}
