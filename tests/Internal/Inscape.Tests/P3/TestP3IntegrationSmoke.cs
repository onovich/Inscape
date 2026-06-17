using System.Text;
using System.Text.Json;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void P3IntegrationSmokeConnectsUsageAuditConditionsAndRuntimeState() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-p3-integration-smoke-" + Guid.NewGuid().ToString("N"));
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
    { "name": "player.name", "returnType": "string", "isAsync": false, "parameters": [] },
    { "name": "has_item", "returnType": "bool", "isAsync": false, "parameters": [{ "name": "itemId", "type": "string", "idKind": "item" }] },
    { "name": "trust", "returnType": "number", "isAsync": false, "parameters": [{ "name": "roleId", "type": "string", "idKind": "role" }] },
    { "name": "debug_mode", "returnType": "bool", "isAsync": false, "parameters": [] }
  ],
  "actions": [
    { "name": "play_timeline", "mode": "wait", "parameters": [{ "name": "timelineId", "type": "string", "idKind": "timeline", "required": true }] }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(configDirectory, "inscape.host.bridge.json"), """
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "ids": [
    { "kind": "timeline", "name": "mira_reveal", "host": { "assetId": 101 } },
    { "kind": "item", "name": "silver_key", "host": { "assetId": 202 } },
    { "kind": "role", "name": "mira", "host": { "assetId": 303 } }
  ],
  "actions": [
    { "name": "play_timeline", "handler": { "kind": "test" } }
  ],
  "queries": [
    { "name": "player.name", "handler": { "kind": "test" } },
    { "name": "has_item", "handler": { "kind": "test" } },
    { "name": "trust", "handler": { "kind": "test" } },
    { "name": "debug_mode", "handler": { "kind": "test" } }
  ]
}
""", Encoding.UTF8);

                File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: [player.name] arrives.
? Choose:
- [has_item("silver_key") and trust(mira) >= 3] Use silver key -> unlocked
- Leave -> leave
? [debug_mode()] -> debug
-> leave

# unlocked
@emit play_timeline "mira_reveal"
Narrator: Unlocked.
-> end

# debug
Narrator: Debug.
-> end

# leave
Narrator: Leave.
-> end

# end
Narrator: End.
""", Encoding.UTF8);

                string compileJson = RunCliForOutput(new[] { "compile-project", directory });
                using (JsonDocument compileDocument = JsonDocument.Parse(compileJson)) {
                    JsonElement root = compileDocument.RootElement;
                    AssertEqual("inscape.project-ir", root.GetProperty("format").GetString(), "P3 compile format");
                    AssertFalse(root.GetProperty("hasErrors").GetBoolean(), "P3 compile should be diagnostic-clean.");
                    AssertTrue(P3JsonContainsString(root.GetProperty("graph"), "has_item"), "P3 compile should preserve choice condition query.");
                    AssertTrue(P3JsonContainsString(root.GetProperty("graph"), "debug_mode"), "P3 compile should preserve conditional jump query.");
                }

                string usageJson = RunCliForOutput(new[] { "inspect-usage-project", directory });
                using (JsonDocument usageDocument = JsonDocument.Parse(usageJson)) {
                    JsonElement root = usageDocument.RootElement;
                    JsonElement summary = root.GetProperty("summary");
                    AssertEqual("inscape.usage", root.GetProperty("format").GetString(), "P3 usage format");
                    AssertEqual(4, summary.GetProperty("queryCount").GetInt32(), "P3 usage query count");
                    AssertEqual(1, summary.GetProperty("actionCount").GetInt32(), "P3 usage action count");
                    AssertEqual(3, summary.GetProperty("requiredIdCount").GetInt32(), "P3 usage required id count");
                    AssertTrue(P3ArrayContainsProperty(root.GetProperty("queries"), "context", "query-interpolation"), "P3 usage should include interpolation queries.");
                    AssertTrue(P3ArrayContainsProperty(root.GetProperty("queries"), "context", "choice-condition"), "P3 usage should include choice condition queries.");
                    AssertTrue(P3ArrayContainsProperty(root.GetProperty("queries"), "context", "conditional-jump"), "P3 usage should include conditional jump queries.");
                    AssertTrue(P3ArrayContainsProperty(root.GetProperty("actions"), "name", "play_timeline"), "P3 usage should include schema action usage.");
                    AssertTrue(P3RequiredIdExists(root, "timeline", "mira_reveal"), "P3 usage should require timeline id.");
                    AssertTrue(P3RequiredIdExists(root, "item", "silver_key"), "P3 usage should require item id.");
                    AssertTrue(P3RequiredIdExists(root, "role", "mira"), "P3 usage should require role id.");
                }

                string auditJson = RunCliForOutput(new[] { "audit-host-integration-project", directory });
                using (JsonDocument auditDocument = JsonDocument.Parse(auditJson)) {
                    JsonElement root = auditDocument.RootElement;
                    JsonElement summary = root.GetProperty("summary");
                    AssertEqual("inscape.host-integration.audit", root.GetProperty("format").GetString(), "P3 host audit format");
                    AssertEqual(4, summary.GetProperty("queryUsageCount").GetInt32(), "P3 host audit query usage count");
                    AssertEqual(1, summary.GetProperty("actionUsageCount").GetInt32(), "P3 host audit action usage count");
                    AssertEqual(3, summary.GetProperty("requiredIdCount").GetInt32(), "P3 host audit required id count");
                    AssertEqual(0, summary.GetProperty("diagnosticCount").GetInt32(), "P3 host audit diagnostic count");
                }

                string statePath = Path.Combine(configDirectory, "runtime-state.json");
                string stateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--export-state",
                    "--script-version",
                    "script-p3-smoke",
                    "--host-checkpoint-id",
                    "checkpoint-p3-smoke",
                });
                File.WriteAllText(statePath, stateJson, Encoding.UTF8);

                using (JsonDocument stateDocument = JsonDocument.Parse(stateJson)) {
                    JsonElement root = stateDocument.RootElement;
                    AssertEqual("inscape.runtime-state", root.GetProperty("format").GetString(), "P3 runtime state format");
                    AssertEqual("script-p3-smoke", root.GetProperty("scriptVersion").GetString(), "P3 runtime state script version");
                    AssertEqual("start", root.GetProperty("position").GetProperty("nodeId").GetString(), "P3 runtime state node");
                    AssertEqual("checkpoint-p3-smoke", root.GetProperty("host").GetProperty("checkpointId").GetString(), "P3 runtime state checkpoint");
                    AssertTrue(root.GetProperty("facts").GetProperty("visitedNodes").GetArrayLength() > 0, "P3 runtime state should record visited nodes.");
                }

                string validationJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-state",
                    statePath,
                    "--script-version",
                    "script-p3-smoke",
                });
                using (JsonDocument validationDocument = JsonDocument.Parse(validationJson)) {
                    AssertEqual("inscape.runtime-state-validation", validationDocument.RootElement.GetProperty("format").GetString(), "P3 runtime validation format");
                    AssertEqual("compatible", ReadLowerStatus(validationDocument), "P3 runtime validation status");
                }
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static bool P3RequiredIdExists(JsonElement root, string kind, string name) {
            foreach (JsonElement requiredId in root.GetProperty("requiredIds").EnumerateArray()) {
                if (requiredId.GetProperty("kind").GetString() == kind
                    && requiredId.GetProperty("name").GetString() == name) {
                    return true;
                }
            }

            return false;
        }

        static bool P3ArrayContainsProperty(JsonElement array, string propertyName, string expectedValue) {
            foreach (JsonElement item in array.EnumerateArray()) {
                if (item.TryGetProperty(propertyName, out JsonElement value)
                    && value.GetString() == expectedValue) {
                    return true;
                }
            }

            return false;
        }

        static bool P3JsonContainsString(JsonElement element, string value) {
            if (element.ValueKind == JsonValueKind.String) {
                return (element.GetString() ?? string.Empty).Contains(value, StringComparison.Ordinal);
            }

            if (element.ValueKind == JsonValueKind.Object) {
                foreach (JsonProperty property in element.EnumerateObject()) {
                    if (P3JsonContainsString(property.Value, value)) {
                        return true;
                    }
                }
            }

            if (element.ValueKind == JsonValueKind.Array) {
                foreach (JsonElement item in element.EnumerateArray()) {
                    if (P3JsonContainsString(item, value)) {
                        return true;
                    }
                }
            }

            return false;
        }

    }
}
