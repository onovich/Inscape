using System.Text;
using System.Text.Json;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void HostSchemaJsonSchemaDefinesActionsAndLegacyEvents() {
            string schemaPath = FindRepositoryFile(Path.Combine("src",
                                                                "ExternalSupport",
                                                                "VSCode",
                                                                "Resources",
                                                                "Schemas",
                                                                "host-schema.schema.json"));
            string schemaText = File.ReadAllText(schemaPath, Encoding.UTF8);
            using JsonDocument document = JsonDocument.Parse(schemaText);

            JsonElement root = document.RootElement;
            JsonElement properties = root.GetProperty("properties");
            AssertTrue(properties.TryGetProperty("queries", out _), "Host Schema JSON Schema should define queries.");
            AssertTrue(properties.TryGetProperty("actions", out JsonElement actionsProperty), "Host Schema JSON Schema should define P3 actions.");
            AssertTrue(properties.TryGetProperty("events", out JsonElement eventsProperty), "Host Schema JSON Schema should keep legacy events.");

            AssertEqual("#/$defs/action", actionsProperty.GetProperty("items").GetProperty("$ref").GetString(), "Host Schema actions ref");
            AssertTrue(eventsProperty.TryGetProperty("deprecated", out JsonElement deprecated) && deprecated.GetBoolean(), "Legacy events should be marked deprecated in JSON Schema.");

            JsonElement defs = root.GetProperty("$defs");
            JsonElement action = defs.GetProperty("action");
            AssertTrue(RequiredContains(action, "name"), "Action schema should require name.");
            AssertTrue(RequiredContains(action, "mode"), "Action schema should require mode.");
            AssertTrue(EnumContains(action.GetProperty("properties").GetProperty("mode"), "fire"), "Action mode should include fire.");
            AssertTrue(EnumContains(action.GetProperty("properties").GetProperty("mode"), "wait"), "Action mode should include wait.");
            AssertTrue(EnumContains(action.GetProperty("properties").GetProperty("mode"), "handoff"), "Action mode should include handoff.");

            JsonElement parameter = defs.GetProperty("parameter");
            AssertTrue(parameter.GetProperty("properties").TryGetProperty("idKind", out _), "Parameter schema should define idKind.");
            JsonElement query = defs.GetProperty("query");
            AssertTrue(query.GetProperty("properties").TryGetProperty("idKind", out _), "Query schema should define idKind.");

            AssertTrue(EnumContains(defs.GetProperty("typeName"), "number"), "Host Schema typeName should include number.");
            AssertFalse(schemaText.Contains("unityGuid", StringComparison.OrdinalIgnoreCase), "Host Schema JSON Schema must not expose Unity GUID.");
            AssertFalse(schemaText.Contains("addressable", StringComparison.OrdinalIgnoreCase), "Host Schema JSON Schema must not expose Addressables.");
            AssertFalse(schemaText.Contains("assetPath", StringComparison.OrdinalIgnoreCase), "Host Schema JSON Schema must not expose asset paths.");
            AssertFalse(schemaText.Contains("bird", StringComparison.OrdinalIgnoreCase), "Host Schema JSON Schema must not expose Bird ids.");
        }

        static bool RequiredContains(JsonElement schema, string propertyName) {
            if (!schema.TryGetProperty("required", out JsonElement required) || required.ValueKind != JsonValueKind.Array) {
                return false;
            }

            foreach (JsonElement item in required.EnumerateArray()) {
                if (item.ValueKind == JsonValueKind.String && item.GetString() == propertyName) {
                    return true;
                }
            }

            return false;
        }

        static bool EnumContains(JsonElement schema, string value) {
            if (!schema.TryGetProperty("enum", out JsonElement values) || values.ValueKind != JsonValueKind.Array) {
                return false;
            }

            foreach (JsonElement item in values.EnumerateArray()) {
                if (item.ValueKind == JsonValueKind.String && item.GetString() == value) {
                    return true;
                }
            }

            return false;
        }

        static string FindRepositoryFile(string relativePath) {
            DirectoryInfo? directory = new DirectoryInfo(Directory.GetCurrentDirectory());
            while (directory != null) {
                string candidate = Path.Combine(directory.FullName, relativePath);
                if (File.Exists(candidate)) {
                    return candidate;
                }

                directory = directory.Parent;
            }

            throw new FileNotFoundException("Could not find repository file: " + relativePath);
        }

    }
}
