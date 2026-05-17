using System.Text;
using System.Text.Json;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void CliDiagnoseEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests");
            Directory.CreateDirectory(directory);

            string path = Path.Combine(directory, "diagnose-" + Guid.NewGuid().ToString("N") + ".inscape");
            File.WriteAllText(path, """
# start
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
                exitCode = CliCore.Main(new[] { "diagnose", path });
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
                exitCode = CliCore.Main(new[] { "commands" });
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
            AssertTrue(text.Contains("audit-query-interpolation-project"), "Commands should list query interpolation audit command.");
            AssertTrue(text.Contains("inspect-host-schema-project"), "Commands should list host schema inspection command.");
            AssertFalse(text.Contains("export-unity-sample-role-template"), "Internal CLI should not list UnitySample role template command.");
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
                exitCode = CliCore.Main(new[] { "help", "export-host-schema-template" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string text = output.ToString();
            AssertEqual(0, exitCode, "Help command exit code");
            AssertEqual("", error.ToString().Trim(), "Help command stderr");
            AssertTrue(text.Contains("export-host-schema-template"), "Help should include command name.");
            AssertTrue(text.Contains("host schema template"), "Help should include host schema description.");
            AssertTrue(text.Contains("inscape.host.schema.json"), "Help should include output file name.");
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
                exitCode = CliCore.Main(new[] { "export-host-schema-template" });
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

        static void CliAuditQueryInterpolationProjectEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-query-audit-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "hostSchema": "config/inscape.host.schema.json"
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(configDirectory, "inscape.host.schema.json"), """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    { "name": "player.gold", "returnType": "number", "isAsync": false, "parameters": [] },
    { "name": "has_item", "returnType": "bool", "isAsync": false, "parameters": [{ "name": "itemId", "type": "string" }] }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
旁白：金币 [player.gold]，物品 [has_item]，未知 [player.godl]。
旁白：[timeline: court_intro] 是 legacy binding，不是 query。
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "audit-query-interpolation-project", directory, "--format", "json" });
                using JsonDocument document = JsonDocument.Parse(output);
                JsonElement root = document.RootElement;
                AssertEqual("inscape.query-interpolation.audit", root.GetProperty("format").GetString(), "Audit format");
                AssertEqual(3, root.GetProperty("summary").GetProperty("interpolationCount").GetInt32(), "Audit interpolation count");
                AssertEqual(2, root.GetProperty("summary").GetProperty("diagnosticCount").GetInt32(), "Audit diagnostic count");
                AssertEqual(1, CountDiagnostics(root, "IQI001"), "Audit unknown query diagnostic count");
                AssertEqual(1, CountDiagnostics(root, "IQI002"), "Audit parameterized query diagnostic count");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliInspectHostSchemaProjectEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-host-schema-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "hostSchema": "config/inscape.host.schema.json"
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(configDirectory, "inscape.host.schema.json"), """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    { "name": "player.gold", "returnType": "int", "isAsync": false, "parameters": [] }
  ],
  "events": [
    { "name": "open_window", "delivery": "blocking", "sideEffects": true, "parameters": [{ "name": "windowId", "type": "string" }] }
  ]
}
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "inspect-host-schema-project", directory });
                using JsonDocument document = JsonDocument.Parse(output);
                JsonElement root = document.RootElement;
                AssertEqual("inscape.host-schema.capabilities", root.GetProperty("format").GetString(), "Host schema capabilities format");
                AssertTrue(root.GetProperty("hostSchema").GetProperty("loaded").GetBoolean(), "Host schema should be loaded.");
                AssertEqual(1, root.GetProperty("queries").GetArrayLength(), "Host schema capability query count");
                AssertEqual(1, root.GetProperty("events").GetArrayLength(), "Host schema capability event count");
                AssertEqual("player.gold", root.GetProperty("queries")[0].GetProperty("name").GetString(), "Host schema capability query name");
                AssertEqual("open_window", root.GetProperty("events")[0].GetProperty("name").GetString(), "Host schema capability event name");
                AssertEqual("blocking", root.GetProperty("events")[0].GetProperty("delivery").GetString(), "Host schema capability event delivery");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void StoryGraphCompilerDomainResolvesCrossFileTargets() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# start
Narrator: Start.
-> second.node
"""),
                new DslScriptSourceModel("memory://b.inscape", """
# second.node
Narrator: Second page.
"""),
            }, "memory://project");

            AssertFalse(ContainsCode(result, "INS020"), "Cross-file target should be resolved.");
            AssertEqual(2, result.Graph.Nodes.Count, "Project graph node count");
            AssertEqual(1, result.Graph.Edges.Count, "Project graph edge count");
        }

        static void StoryGraphCompilerDomainDiagnosesDuplicateNodes() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# same.node
Narrator: First copy.
"""),
                new DslScriptSourceModel("memory://b.inscape", """
# same.node
Narrator: Second copy.
"""),
            }, "memory://project");

            AssertTrue(result.HasErrors, "Project duplicate node should be an error.");
            AssertTrue(ContainsCode(result, "INS030"), "Expected INS030 duplicate project node diagnostic.");
        }

        static void StoryGraphCompilerDomainDiagnosesDuplicateHashTitles() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# 法庭开场
旁白：第一版。
"""),
                new DslScriptSourceModel("memory://b.inscape", """
# 法庭开场
旁白：第二版。
"""),
            }, "memory://project");

            AssertTrue(result.HasErrors, "Project duplicate hash title should be an error.");
            AssertTrue(ContainsCode(result, "INS030"), "Expected INS030 duplicate project title diagnostic.");
        }

        static void CliDiagnoseProjectAppliesOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            string startPath = Path.Combine(directory, "start.inscape");
            string targetPath = Path.Combine(directory, "target.inscape");
            string overridePath = Path.Combine(directory, "target.override.inscape");

            File.WriteAllText(startPath, """
# start
Narrator: Start.
-> target.node
""", Encoding.UTF8);
            File.WriteAllText(targetPath, """
# old.node
Narrator: Old node.
""", Encoding.UTF8);
            File.WriteAllText(overridePath, """
# target.node
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
                exitCode = CliCore.Main(new[] { "diagnose-project", directory, "--override", targetPath, overridePath });
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
                exitCode = CliCore.Main(new[] { "compile-project", directory });
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

        static void StoryGraphCompilerDomainUsesEntryMetadata() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://00-orphan.inscape", """
# orphan.node
Narrator: This file sorts first.
"""),
                new DslScriptSourceModel("memory://01-start.inscape", """
# start
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

        static void StoryGraphCompilerDomainAppliesEntryOverride() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://00-orphan.inscape", """
# orphan.node
Narrator: First by file order.
"""),
                new DslScriptSourceModel("memory://01-start.inscape", """
# start
Narrator: Temporary debug entry.
-> orphan.node
"""),
            }, "memory://project", "start");

            AssertFalse(result.HasErrors, "Entry override project should not have errors.");
            AssertEqual("start", result.EntryNodeName, "Entry override node name");
            AssertFalse(ContainsAnyCode(result, "INS021"), "Entry override should be used for reachability.");
            AssertFalse(ContainsAnyCode(result, "INS032"), "Entry override should suppress fallback diagnostic.");
        }

        static void StoryGraphCompilerDomainDiagnosesMissingEntryOverride() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# start
Narrator: Start.
"""),
            }, "memory://project", "missing.node");

            AssertTrue(result.HasErrors, "Missing entry override should be an error.");
            AssertTrue(ContainsCode(result, "INS034"), "Expected INS034 missing entry override diagnostic.");
            AssertEqual("", result.EntryNodeName, "Missing entry override should not resolve an entry.");
        }

        static void StoryGraphCompilerDomainDiagnosesMultipleEntries() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# first.entry
@entry
Narrator: Entry one.
"""),
                new DslScriptSourceModel("memory://b.inscape", """
# second.entry
@entry
Narrator: Entry two.
"""),
            }, "memory://project");

            AssertTrue(result.HasErrors, "Multiple entries should be an error.");
            AssertTrue(ContainsCode(result, "INS031"), "Expected INS031 multiple entry diagnostic.");
        }

        static void StoryGraphCompilerDomainReportsFallbackEntry() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("memory://a.inscape", """
# start
Narrator: No explicit entry.
"""),
            }, "memory://project");

            AssertFalse(result.HasErrors, "Fallback entry should not be an error.");
            AssertTrue(ContainsAnyCode(result, "INS032"), "Expected INS032 fallback entry diagnostic.");
        }
    }
}
