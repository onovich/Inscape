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
            AssertTrue(text.Contains("Host integration:"), "Commands should list host integration group.");
            AssertTrue(text.Contains("export-host-schema-template"), "Commands should list host schema template command.");
            AssertTrue(text.Contains("audit-query-interpolation-project"), "Commands should list query interpolation audit command.");
            AssertTrue(text.Contains("inspect-host-schema-project"), "Commands should list host schema inspection command.");
            AssertTrue(text.Contains("inspect-usage-project"), "Commands should list usage manifest inspection command.");
            AssertTrue(text.Contains("audit-host-integration-project"), "Commands should list host integration audit command.");
            AssertTrue(text.Contains("export-host-integration-package-project"), "Commands should list host integration package export command.");
            AssertTrue(text.Contains("update-node-map-project"), "Commands should list node map update command.");
            AssertTrue(text.Contains("apply-node-map-candidate-project"), "Commands should list node map candidate apply command.");
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

        static void CliHelpEmitsHostIntegrationPackageDetails() {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliCore.Main(new[] { "help", "export-host-integration-package-project" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string text = output.ToString();
            AssertEqual(0, exitCode, "Host integration package help exit code");
            AssertEqual("", error.ToString().Trim(), "Host integration package help stderr");
            AssertTrue(text.Contains("export-host-integration-package-project"), "Help should include package command name.");
            AssertTrue(text.Contains("-o package-dir"), "Help should document required package output directory.");
            AssertTrue(text.Contains("Round 3 writes the manifest, graph, usage"), "Help should state Round 3 artifact assembly boundary.");
        }

        static void CliHostIntegrationPackageWritesManifest() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-host-integration-package-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            try {
                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Hello package.
""", Encoding.UTF8);

                (int ExitCode, string Stdout, string Stderr) missingOutput = RunCliForFailure(new[] { "export-host-integration-package-project", directory });
                AssertEqual(2, missingOutput.ExitCode, "Package export without -o should be usage error.");
                AssertEqual("", missingOutput.Stdout.Trim(), "Package export without -o should not write stdout.");
                AssertTrue(missingOutput.Stderr.Contains("requires -o <out-dir>"), "Package export without -o should explain required output.");

                string outputDirectory = Path.Combine(directory, "package");
                string output = RunCliForOutput(new[] { "export-host-integration-package-project", directory, "-o", outputDirectory }).Trim();
                string manifestPath = Path.Combine(outputDirectory, "manifest.json");
                AssertEqual(Path.GetFullPath(manifestPath), output, "Package export should print manifest path.");
                AssertTrue(File.Exists(manifestPath), "Package export should write manifest.json.");

                string firstManifest = File.ReadAllText(manifestPath, Encoding.UTF8);
                using (JsonDocument document = JsonDocument.Parse(firstManifest)) {
                    JsonElement root = document.RootElement;
                    AssertEqual("inscape.integration-package", root.GetProperty("format").GetString(), "Package manifest format");
                    AssertEqual(1, root.GetProperty("formatVersion").GetInt32(), "Package manifest format version");
                    AssertEqual(new DirectoryInfo(directory).Name, root.GetProperty("workspace").GetProperty("name").GetString(), "Package manifest workspace name");
                    AssertFalse(root.GetProperty("capabilities").GetProperty("runtimeIntegration").GetBoolean(), "Package manifest runtimeIntegration flag");
                    AssertFalse(root.GetProperty("capabilities").GetProperty("previewBridge").GetBoolean(), "Package manifest previewBridge flag");
                    AssertFalse(root.GetProperty("capabilities").GetProperty("writesHostData").GetBoolean(), "Package manifest writesHostData flag");
                    AssertFalse(root.GetProperty("capabilities").GetProperty("containsHostDependency").GetBoolean(), "Package manifest containsHostDependency flag");

                    JsonElement artifacts = root.GetProperty("artifacts");
                    AssertTrue(artifacts.GetArrayLength() >= 8, "Package manifest should contain artifact index.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "manifest", "manifest.json", true, "ready"), "Package manifest should index manifest.json as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "narrative-graph-ir", "graph/project-ir.json", true, "ready"), "Package manifest should index graph IR as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "usage-manifest", "usage/usage.json", true, "ready"), "Package manifest should index usage manifest as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "host-schema-capabilities", "host/host-schema-capabilities.json", false, "ready"), "Package manifest should index host schema capabilities as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "host-integration-audit", "host/host-integration-audit.json", true, "ready"), "Package manifest should index host integration audit as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "localization-csv", "localization/l10n.csv", true, "ready"), "Package manifest should index localization CSV as ready.");
                    AssertTrue(ContainsPackageArtifactJson(artifacts, "source-locations", "source-map/source-locations.json", true, "missing"), "Package manifest should leave source locations for Round 4.");
                    for (int i = 0; i < artifacts.GetArrayLength(); i += 1) {
                        string artifactPath = artifacts[i].GetProperty("path").GetString() ?? string.Empty;
                        AssertFalse(Path.IsPathRooted(artifactPath), "Package artifact path must be package-relative.");
                        AssertFalse(artifactPath.Contains("\\"), "Package artifact path must not leak platform separators.");
                        AssertFalse(artifactPath.Contains(".."), "Package artifact path must not traverse.");
                    }
                }

                AssertPackageJsonFormat(Path.Combine(outputDirectory, "graph", "project-ir.json"), "inscape.project-ir", "Package graph artifact format");
                AssertPackageJsonFormat(Path.Combine(outputDirectory, "usage", "usage.json"), "inscape.usage", "Package usage artifact format");
                AssertPackageJsonFormat(Path.Combine(outputDirectory, "host", "host-schema-capabilities.json"), "inscape.host-schema.capabilities", "Package host schema artifact format");
                AssertPackageJsonFormat(Path.Combine(outputDirectory, "host", "host-integration-audit.json"), "inscape.host-integration.audit", "Package host integration audit artifact format");
                string localizationCsv = File.ReadAllText(Path.Combine(outputDirectory, "localization", "l10n.csv"), Encoding.UTF8);
                AssertTrue(localizationCsv.Contains("anchor"), "Package localization CSV should contain header.");

                string secondOutput = RunCliForOutput(new[] { "export-host-integration-package-project", directory, "-o", outputDirectory }).Trim();
                string secondManifest = File.ReadAllText(manifestPath, Encoding.UTF8);
                AssertEqual(output, secondOutput, "Repeated package export should print the same manifest path.");
                AssertEqual(firstManifest, secondManifest, "Repeated package export should keep manifest bytes stable.");

                File.WriteAllText(Path.Combine(outputDirectory, "graph", "unexpected.json"), "outside package", Encoding.UTF8);
                (int ExitCode, string Stdout, string Stderr) dirtyOutput = RunCliForFailure(new[] { "export-host-integration-package-project", directory, "-o", outputDirectory });
                AssertEqual(2, dirtyOutput.ExitCode, "Package export should reject non-package output directory content.");
                AssertEqual("", dirtyOutput.Stdout.Trim(), "Rejected package export should not write stdout.");
                AssertTrue(dirtyOutput.Stderr.Contains("contains non-package files"), "Rejected package export should explain non-package output content.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void AssertPackageJsonFormat(string path, string expectedFormat, string message) {
            AssertTrue(File.Exists(path), message + " exists");
            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(path, Encoding.UTF8));
            AssertEqual(expectedFormat, document.RootElement.GetProperty("format").GetString(), message);
        }

        static bool ContainsPackageArtifactJson(JsonElement artifacts,
                                                string kind,
                                                string path,
                                                bool required,
                                                string status) {
            for (int i = 0; i < artifacts.GetArrayLength(); i += 1) {
                JsonElement artifact = artifacts[i];
                if (artifact.GetProperty("kind").GetString() == kind
                    && artifact.GetProperty("path").GetString() == path
                    && artifact.GetProperty("required").GetBoolean() == required
                    && artifact.GetProperty("status").GetString() == status) {
                    return true;
                }
            }

            return false;
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
            AssertTrue(root.GetProperty("actions").GetArrayLength() > 0, "Host schema should include action examples.");
            AssertFalse(root.TryGetProperty("events", out _), "Host schema template should prefer P3 actions over legacy events.");
            AssertEqual("has_item", root.GetProperty("queries")[0].GetProperty("name").GetString(), "Host schema query example name");
            AssertEqual("open_window", root.GetProperty("actions")[0].GetProperty("name").GetString(), "Host schema action example name");
            AssertEqual("fire", root.GetProperty("actions")[0].GetProperty("mode").GetString(), "Host schema action example mode");
            AssertEqual("item", root.GetProperty("queries")[0].GetProperty("parameters")[0].GetProperty("idKind").GetString(), "Host schema query parameter id kind");
            AssertEqual("ui-window", root.GetProperty("actions")[0].GetProperty("parameters")[0].GetProperty("idKind").GetString(), "Host schema action parameter id kind");
            AssertFalse(root.GetProperty("actions")[0].TryGetProperty("idKind", out _), "Host schema action should omit empty optional id kind.");
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
旁白：[note: court_intro] 是带冒号的 metadata，不是 query。
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
  "actions": [
    { "name": "open_window", "mode": "wait", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window" }] }
  ],
  "events": [
    { "name": "legacy_window", "delivery": "blocking", "sideEffects": true, "parameters": [{ "name": "windowId", "type": "string" }] }
  ]
}
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "inspect-host-schema-project", directory });
                using JsonDocument document = JsonDocument.Parse(output);
                JsonElement root = document.RootElement;
                AssertEqual("inscape.host-schema.capabilities", root.GetProperty("format").GetString(), "Host schema capabilities format");
                AssertTrue(root.GetProperty("hostSchema").GetProperty("loaded").GetBoolean(), "Host schema should be loaded.");
                AssertEqual(1, root.GetProperty("queries").GetArrayLength(), "Host schema capability query count");
                AssertEqual(1, root.GetProperty("actions").GetArrayLength(), "Host schema capability action count");
                AssertEqual(1, root.GetProperty("events").GetArrayLength(), "Host schema capability event count");
                AssertEqual("player.gold", root.GetProperty("queries")[0].GetProperty("name").GetString(), "Host schema capability query name");
                AssertEqual("open_window", root.GetProperty("actions")[0].GetProperty("name").GetString(), "Host schema capability action name");
                AssertEqual("wait", root.GetProperty("actions")[0].GetProperty("mode").GetString(), "Host schema capability action mode");
                AssertEqual("ui-window", root.GetProperty("actions")[0].GetProperty("parameters")[0].GetProperty("idKind").GetString(), "Host schema capability action parameter id kind");
                AssertEqual("legacy_window", root.GetProperty("events")[0].GetProperty("name").GetString(), "Host schema capability event name");
                AssertEqual("blocking", root.GetProperty("events")[0].GetProperty("delivery").GetString(), "Host schema capability event delivery");
                AssertTrue(root.GetProperty("events")[0].GetProperty("isLegacy").GetBoolean(), "Host schema capability legacy event marker");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliInspectUsageProjectEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-usage-" + Guid.NewGuid().ToString("N"));
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
    { "name": "player.name", "returnType": "string", "isAsync": false, "parameters": [] },
    { "name": "has_item", "returnType": "bool", "isAsync": false, "parameters": [{ "name": "itemId", "type": "string", "idKind": "item" }] }
  ],
  "actions": [
    { "name": "play_timeline", "mode": "wait", "parameters": [{ "name": "timelineId", "type": "string", "idKind": "timeline" }] }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
@timeline.talking.exit court_intro
@emit play_timeline "mira_reveal"
Narrator: [player.name] and [player.godl].
? Choose:
- [has_item("silver_key")] Use silver key -> gate.open
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "inspect-usage-project", directory });
                using (JsonDocument document = JsonDocument.Parse(output)) {
                    JsonElement root = document.RootElement;
                    AssertEqual("inscape.usage", root.GetProperty("format").GetString(), "Usage format");
                    AssertEqual(1, root.GetProperty("formatVersion").GetInt32(), "Usage format version");
                    AssertEqual(3, root.GetProperty("summary").GetProperty("queryCount").GetInt32(), "Usage query count");
                    AssertEqual(2, root.GetProperty("summary").GetProperty("actionCount").GetInt32(), "Usage action count");
                    AssertEqual(3, root.GetProperty("summary").GetProperty("requiredIdCount").GetInt32(), "Usage required id count");
                    AssertEqual("player.godl", root.GetProperty("queries")[1].GetProperty("name").GetString(), "Unknown query should be preserved.");
                    AssertEqual("choice-condition", root.GetProperty("queries")[2].GetProperty("context").GetString(), "Choice condition usage context should be preserved.");
                    AssertEqual("silver_key", root.GetProperty("queries")[2].GetProperty("arguments")[0].GetProperty("value").GetString(), "Choice condition literal argument should be preserved.");
                    AssertEqual("story.inscape", root.GetProperty("queries")[0].GetProperty("source").GetProperty("path").GetString(), "Usage query source path.");
                    AssertEqual("story.inscape", root.GetProperty("actions")[1].GetProperty("source").GetProperty("path").GetString(), "Usage action source path.");
                    AssertFalse(root.GetProperty("actions")[1].GetProperty("arguments")[0].TryGetProperty("source", out JsonElement _), "Usage arguments should not expose internal source.");
                    AssertEqual("story.inscape", root.GetProperty("requiredIds")[0].GetProperty("source").GetProperty("path").GetString(), "Usage required id source path.");
                }

                string usagePath = Path.Combine(configDirectory, "usage.json");
                string fileOutput = RunCliForOutput(new[] { "inspect-usage-project", directory, "-o", usagePath });
                AssertEqual("", fileOutput.Trim(), "Usage -o should not write JSON to stdout.");
                AssertTrue(File.Exists(usagePath), "Usage -o should write output file.");
                using (JsonDocument fileDocument = JsonDocument.Parse(File.ReadAllText(usagePath, Encoding.UTF8))) {
                    AssertEqual("inscape.usage", fileDocument.RootElement.GetProperty("format").GetString(), "Usage output file format");
                }
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliAuditHostIntegrationProjectEmitsJson() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-host-integration-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "hostSchema": "config/inscape.host.schema.json",
  "hostBridge": "config/inscape.host.bridge.json"
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(configDirectory, "inscape.host.schema.json"), """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    { "name": "player.name", "returnType": "string", "isAsync": false, "parameters": [] }
  ],
  "actions": [
    { "name": "open_window", "mode": "fire", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window", "required": true }] }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(configDirectory, "inscape.host.bridge.json"), """
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "ids": [
    { "kind": "ui-window", "name": "inventory_panel", "host": { "assetId": 7 } }
  ],
  "actions": [
    { "name": "open_window", "handler": { "kind": "test" } }
  ],
  "queries": [
    { "name": "player.name", "handler": { "kind": "test" } }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
@emit open_window inventory_panel
Narrator: [player.name].
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "audit-host-integration-project", directory });
                using (JsonDocument document = JsonDocument.Parse(output)) {
                    JsonElement root = document.RootElement;
                    AssertEqual("inscape.host-integration.audit", root.GetProperty("format").GetString(), "Host integration audit format");
                    AssertEqual(1, root.GetProperty("summary").GetProperty("queryUsageCount").GetInt32(), "Host integration query usage count");
                    AssertEqual(1, root.GetProperty("summary").GetProperty("actionUsageCount").GetInt32(), "Host integration action usage count");
                    AssertEqual(1, root.GetProperty("summary").GetProperty("requiredIdCount").GetInt32(), "Host integration required id count");
                    AssertEqual(0, root.GetProperty("summary").GetProperty("diagnosticCount").GetInt32(), "Host integration diagnostic count");
                }

                string auditPath = Path.Combine(configDirectory, "host-integration-audit.json");
                string fileOutput = RunCliForOutput(new[] { "audit-host-integration-project", directory, "-o", auditPath });
                AssertEqual("", fileOutput.Trim(), "Host integration audit -o should not write JSON to stdout.");
                AssertTrue(File.Exists(auditPath), "Host integration audit -o should write output file.");
                using (JsonDocument fileDocument = JsonDocument.Parse(File.ReadAllText(auditPath, Encoding.UTF8))) {
                    AssertEqual("inscape.host-integration.audit", fileDocument.RootElement.GetProperty("format").GetString(), "Host integration audit output file format");
                }
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliUpdateNodeMapProjectWritesStableNodeMap() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-node-map-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "nodeMap": "config/inscape.node-map.json"
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# 法庭开场
@entry
旁白：开场。
-> 结束

# 结束
旁白：结束。
""", Encoding.UTF8);

                string output = RunCliForOutput(new[] { "update-node-map-project", directory });
                string nodeMapPath = Path.Combine(configDirectory, "inscape.node-map.json");

                AssertEqual(Path.GetFullPath(nodeMapPath), output.Trim(), "Node map command should print written path.");
                AssertTrue(File.Exists(nodeMapPath), "Node map file should be written.");

                using JsonDocument document = JsonDocument.Parse(File.ReadAllText(nodeMapPath, Encoding.UTF8));
                JsonElement root = document.RootElement;
                AssertEqual("inscape.node-map", root.GetProperty("format").GetString(), "Node map format");
                AssertEqual(1, root.GetProperty("formatVersion").GetInt32(), "Node map version");
                AssertEqual(2, root.GetProperty("nodes").GetArrayLength(), "Node map node count");

                JsonElement firstNode = root.GetProperty("nodes")[0];
                AssertTrue(firstNode.GetProperty("id").GetString()!.StartsWith("node_", StringComparison.Ordinal), "Node map id prefix");
                AssertEqual("active", firstNode.GetProperty("status").GetString(), "Node map active status");
                AssertTrue(firstNode.GetProperty("lineAnchorSamples").GetArrayLength() > 0, "Node map should store line anchors.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliUpdateNodeMapProjectWritesReviewReport() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-node-map-report-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "nodeMap": "config/inscape.node-map.json"
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# node.a
@entry
Narrator: Same line.

-> node.b

# node.b
Narrator: Same line.
""", Encoding.UTF8);

                RunCliForOutput(new[] { "update-node-map-project", directory });

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# node.renamed
@entry
Narrator: Same line.

-> node.b

# node.b
Narrator: Same line.
""", Encoding.UTF8);

                string reportPath = Path.Combine(configDirectory, "inscape.node-map-review.json");
                string output = RunCliForOutput(new[] { "update-node-map-project", directory, "--report", reportPath });
                string nodeMapPath = Path.Combine(configDirectory, "inscape.node-map.json");

                AssertEqual(Path.GetFullPath(nodeMapPath), output.Trim(), "Node map command should still print the node map path.");
                AssertTrue(File.Exists(reportPath), "Review report file should be written.");

                using JsonDocument document = JsonDocument.Parse(File.ReadAllText(reportPath, Encoding.UTF8));
                JsonElement root = document.RootElement;
                AssertEqual("inscape.node-map-update-report", root.GetProperty("format").GetString(), "Review report format");
                AssertEqual(1, root.GetProperty("summary").GetProperty("renamedNodeCount").GetInt32(), "Review report renamed count");
                JsonElement firstItem = root.GetProperty("items")[0];
                AssertEqual("renamed", firstItem.GetProperty("kind").GetString(), "Review report item kind");
                AssertEqual("node.renamed", firstItem.GetProperty("title").GetString(), "Review report title");
                AssertEqual("node.a", firstItem.GetProperty("previousTitle").GetString(), "Review report should include previous title.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static void CliApplyNodeMapCandidateProjectWritesSharedReviewDecision() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-cli-node-map-apply-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                string nodeMapPath = Path.Combine(configDirectory, "inscape.node-map.json");
                string previewPath = Path.Combine(configDirectory, "inscape.node-map-preview.json");
                string previewResultPath = Path.Combine(configDirectory, "inscape.node-map-preview-result.json");
                string applyResultPath = Path.Combine(configDirectory, "inscape.node-map-apply-result.json");
                File.WriteAllText(Path.Combine(directory, "inscape.config.json"), """
{
  "nodeMap": "config/inscape.node-map.json"
}
""", Encoding.UTF8);

                File.WriteAllText(nodeMapPath, """
{
  "format": "inscape.node-map",
  "formatVersion": 1,
  "nodes": [
    {
      "id": "node_CURRENT",
      "title": "courtroom.intro",
      "previousTitles": [],
      "sourcePath": "story.inscape",
      "sourceLine": 1,
      "sourceCharacter": 0,
      "firstContentFingerprint": "sha256:current",
      "neighborFingerprint": "sha256:neighbor",
      "lineAnchorSamples": [],
      "status": "active",
      "createdAt": "2026-05-19T01:00:00Z",
      "updatedAt": "2026-05-19T02:00:00Z"
    },
    {
      "id": "node_OLD",
      "title": "intro",
      "previousTitles": ["legacy.intro"],
      "sourcePath": "story.inscape",
      "sourceLine": 1,
      "sourceCharacter": 0,
      "firstContentFingerprint": "sha256:old",
      "neighborFingerprint": "sha256:neighbor",
      "lineAnchorSamples": [],
      "status": "missing",
      "createdAt": "2026-05-18T01:00:00Z",
      "updatedAt": "2026-05-18T02:00:00Z"
    }
  ],
  "tombstones": []
}
""", Encoding.UTF8);

                string dryRunOutput = RunCliForOutput(new[] {
                    "apply-node-map-candidate-project",
                    directory,
                    "--current-id",
                    "node_CURRENT",
                    "--current-title",
                    "courtroom.intro",
                    "--candidate-id",
                    "node_OLD",
                    "--dry-run",
                    previewPath,
                    "--result",
                    previewResultPath,
                });

                AssertEqual(Path.GetFullPath(previewPath), dryRunOutput.Trim(), "Dry run should print preview path.");
                AssertTrue(File.Exists(previewPath), "Dry run preview should be written.");
                AssertTrue(File.Exists(previewResultPath), "Dry run result should be written.");
                AssertEqual("node_CURRENT", ReadNodeMapNodeId(nodeMapPath, "courtroom.intro"), "Dry run should not mutate original node map.");
                using (JsonDocument previewResult = JsonDocument.Parse(File.ReadAllText(previewResultPath, Encoding.UTF8))) {
                    JsonElement root = previewResult.RootElement;
                    AssertEqual("inscape.node-map-candidate-apply-result", root.GetProperty("format").GetString(), "Dry run result format");
                    AssertTrue(root.GetProperty("dryRun").GetBoolean(), "Dry run result should keep dry-run state.");
                    AssertFalse(root.GetProperty("writesNodeMap").GetBoolean(), "Dry run result should not claim sidecar writes.");
                    AssertEqual("node_CURRENT", root.GetProperty("changePreview").GetProperty("removedStableId").GetString(), "Dry run result should preview removed stable id.");
                    AssertEqual("not-required-dry-run", root.GetProperty("backup").GetProperty("status").GetString(), "Dry run result backup status.");
                }

                string applyOutput = RunCliForOutput(new[] {
                    "apply-node-map-candidate-project",
                    directory,
                    "--current-id",
                    "node_CURRENT",
                    "--current-title",
                    "courtroom.intro",
                    "--candidate-id",
                    "node_OLD",
                    "--result",
                    applyResultPath,
                });

                AssertEqual(Path.GetFullPath(nodeMapPath), applyOutput.Trim(), "Apply should print node map path.");
                AssertTrue(File.Exists(applyResultPath), "Apply result should be written.");
                AssertEqual("node_OLD", ReadNodeMapNodeId(nodeMapPath, "courtroom.intro"), "Apply should reuse candidate stable id.");
                AssertFalse(NodeMapContainsTitle(nodeMapPath, "intro"), "Apply should remove candidate duplicate entry.");
                using (JsonDocument applyResult = JsonDocument.Parse(File.ReadAllText(applyResultPath, Encoding.UTF8))) {
                    JsonElement root = applyResult.RootElement;
                    AssertFalse(root.GetProperty("dryRun").GetBoolean(), "Apply result should keep real apply state.");
                    AssertTrue(root.GetProperty("writesNodeMap").GetBoolean(), "Apply result should state that it writes the node map sidecar.");
                    AssertEqual("required-before-write-back", root.GetProperty("backup").GetProperty("status").GetString(), "Apply result backup status.");
                    AssertEqual("node-map-sidecar", root.GetProperty("backup").GetProperty("targetKind").GetString(), "Apply result backup target kind.");
                    AssertTrue(root.GetProperty("recoveryHint").GetString()?.Contains(".inscape-workspace/backups", StringComparison.Ordinal) == true, "Apply result should include backup recovery hint.");
                }

                using JsonDocument document = JsonDocument.Parse(File.ReadAllText(nodeMapPath, Encoding.UTF8));
                JsonElement node = FindNodeMapJsonNode(document.RootElement, "courtroom.intro");
                AssertEqual(2, node.GetProperty("previousTitles").GetArrayLength(), "Apply should preserve and append previous titles.");
                AssertEqual("legacy.intro", node.GetProperty("previousTitles")[0].GetString(), "Apply should preserve candidate previous title.");
                AssertEqual("intro", node.GetProperty("previousTitles")[1].GetString(), "Apply should append candidate title.");
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

        static string ReadNodeMapNodeId(string nodeMapPath, string title) {
            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(nodeMapPath, Encoding.UTF8));
            return FindNodeMapJsonNode(document.RootElement, title).GetProperty("id").GetString() ?? string.Empty;
        }

        static bool NodeMapContainsTitle(string nodeMapPath, string title) {
            using JsonDocument document = JsonDocument.Parse(File.ReadAllText(nodeMapPath, Encoding.UTF8));
            JsonElement nodes = document.RootElement.GetProperty("nodes");
            for (int i = 0; i < nodes.GetArrayLength(); i += 1) {
                if (nodes[i].GetProperty("title").GetString() == title) {
                    return true;
                }
            }

            return false;
        }

        static JsonElement FindNodeMapJsonNode(JsonElement root, string title) {
            JsonElement nodes = root.GetProperty("nodes");
            for (int i = 0; i < nodes.GetArrayLength(); i += 1) {
                if (nodes[i].GetProperty("title").GetString() == title) {
                    return nodes[i];
                }
            }

            throw new InvalidOperationException("Could not find node map JSON title: " + title);
        }
    }
}
