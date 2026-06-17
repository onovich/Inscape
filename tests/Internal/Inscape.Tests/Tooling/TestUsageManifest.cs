using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void UsageManifestReportsQueriesActionsAndRequiredIds() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-usage-manifest-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                string schemaPath = Path.Combine(configDirectory, "inscape.host.schema.json");
                File.WriteAllText(schemaPath, """
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
    { "name": "play_timeline", "mode": "wait", "parameters": [{ "name": "timelineId", "type": "string", "idKind": "timeline" }] },
    { "name": "open_window", "mode": "fire", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window" }] }
  ],
  "events": [
    { "name": "legacy_window", "delivery": "blocking", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window" }] }
  ]
}
""", Encoding.UTF8);

                List<DslScriptSourceModel> sources = new List<DslScriptSourceModel> {
                    new DslScriptSourceModel(Path.Combine(directory, "story.inscape"), """
# start
@entry
@timeline.talking.exit court_intro
@emit play_timeline "mira_reveal"
@emit legacy_window legacy_panel
Narrator: [player.name] and [player.godl].
@emit open_window inventory_panel
Narrator: [note: court_intro] ignored.
? Choose:
- [has_item("silver_key")] Unlock the gate -> gate.open
- [trust(mira) >= 3] Ask Mira -> helper.path
? [debug_mode()] -> debug.path
-> normal.path
""")
                };

                HostSchemaCapabilityCatalogModel catalog = HostSchemaCapabilityCatalogDomain.Read(directory,
                                                                                                  schemaPath,
                                                                                                  new JsonSerializerOptions(JsonSerializerDefaults.Web));
                UsageManifestModel manifest = UsageManifestDomain.Inspect(directory, null, sources, catalog);

                AssertEqual("inscape.usage", manifest.Format, "Usage manifest format");
                AssertEqual("story.inscape", manifest.Queries[0].Source.Path, "Usage query source path");
                AssertEqual(1, manifest.Summary.SourceCount, "Usage source count");
                AssertEqual(5, manifest.Summary.QueryCount, "Usage query count");
                AssertEqual(4, manifest.Summary.ActionCount, "Usage action count");
                AssertEqual(6, manifest.Summary.RequiredIdCount, "Usage required id count");
                AssertEqual(0, manifest.Summary.NonLiteralArgumentCount, "Usage non literal count");

                AssertEqual("player.name", manifest.Queries[0].Name, "First query usage name");
                AssertEqual("query-interpolation", manifest.Queries[0].Context, "First query context");
                AssertEqual("[player.name]", manifest.Queries[0].Raw, "First query raw");
                AssertEqual("player.godl", manifest.Queries[1].Name, "Unknown query should still be recorded");
                AssertEqual("has_item", manifest.Queries[2].Name, "Choice condition query name");
                AssertEqual("choice-condition", manifest.Queries[2].Context, "Choice condition query context");
                AssertEqual("call", manifest.Queries[2].Syntax, "Choice condition query syntax");
                AssertEqual("silver_key", manifest.Queries[2].Arguments[0].Value, "Choice condition query argument value");
                AssertEqual("itemId", manifest.Queries[2].Arguments[0].Name, "Choice condition query argument name");
                AssertEqual("trust", manifest.Queries[3].Name, "Choice comparison query name");
                AssertEqual("mira", manifest.Queries[3].Arguments[0].Value, "Identifier condition argument value");
                AssertEqual("roleId", manifest.Queries[3].Arguments[0].Name, "Identifier condition argument name");
                AssertEqual("debug_mode", manifest.Queries[4].Name, "Conditional jump query name");
                AssertEqual("conditional-jump", manifest.Queries[4].Context, "Conditional jump query context");

                UsageManifestActionUsageModel timeline = manifest.Actions[0];
                AssertEqual("timeline", timeline.Name, "Timeline usage name");
                AssertEqual("host-binding-hook", timeline.UsageKind, "Timeline usage kind");
                AssertEqual("timeline-hook", timeline.Context, "Timeline context");
                AssertEqual("talking.exit", timeline.Phase, "Timeline phase");
                AssertEqual("court_intro", timeline.Arguments[0].Value, "Timeline alias value");

                UsageManifestActionUsageModel schemaAction = manifest.Actions[1];
                AssertEqual("play_timeline", schemaAction.Name, "Schema action name");
                AssertEqual("schema-action", schemaAction.UsageKind, "Schema action usage kind");
                AssertEqual("timelineId", schemaAction.Arguments[0].Name, "Schema action argument name");
                AssertEqual("mira_reveal", schemaAction.Arguments[0].Value, "Schema action argument value");

                UsageManifestActionUsageModel legacyEvent = manifest.Actions[2];
                AssertEqual("legacy_window", legacyEvent.Name, "Legacy event name");
                AssertEqual("legacy-event", legacyEvent.UsageKind, "Legacy event usage kind");

                AssertTrue(ContainsRequiredId(manifest, "timeline", "court_intro", "timeline-hook-alias"), "Usage should include timeline hook required id.");
                AssertTrue(ContainsRequiredId(manifest, "timeline", "mira_reveal", "host-schema-parameter-idKind"), "Usage should include schema action required id.");
                AssertTrue(ContainsRequiredId(manifest, "ui-window", "legacy_panel", "host-schema-parameter-idKind"), "Usage should include legacy event required id.");
                AssertTrue(ContainsRequiredId(manifest, "ui-window", "inventory_panel", "host-schema-parameter-idKind"), "Usage should include identifier action required id.");
                AssertTrue(ContainsRequiredId(manifest, "item", "silver_key", "host-schema-parameter-idKind"), "Usage should include condition query item required id.");
                AssertTrue(ContainsRequiredId(manifest, "role", "mira", "host-schema-parameter-idKind"), "Usage should include condition query role required id.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static bool ContainsRequiredId(UsageManifestModel manifest, string kind, string name, string reason) {
            for (int i = 0; i < manifest.RequiredIds.Count; i += 1) {
                UsageManifestRequiredIdModel requiredId = manifest.RequiredIds[i];
                if (requiredId.Kind == kind && requiredId.Name == name && requiredId.Reason == reason) {
                    return true;
                }
            }

            return false;
        }

    }
}
