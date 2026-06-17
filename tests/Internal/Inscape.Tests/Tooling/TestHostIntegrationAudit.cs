using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void HostIntegrationAuditReportsSchemaAndBridgeGaps() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-host-integration-audit-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                string schemaPath = Path.Combine(configDirectory, "inscape.host.schema.json");
                File.WriteAllText(schemaPath, """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    { "name": "player.name", "returnType": "string", "isAsync": false, "parameters": [] }
  ],
  "actions": [
    { "name": "play_timeline", "mode": "wait", "parameters": [{ "name": "timelineId", "type": "string", "idKind": "timeline", "required": true }] },
    { "name": "open_window", "mode": "fire", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window", "required": true }] }
  ],
  "events": [
    { "name": "legacy_window", "delivery": "blocking", "parameters": [{ "name": "windowId", "type": "string", "idKind": "ui-window", "required": true }] }
  ]
}
""", Encoding.UTF8);

                string bridgePath = Path.Combine(configDirectory, "inscape.host.bridge.json");
                File.WriteAllText(bridgePath, """
{
  "format": "inscape.host-bridge",
  "formatVersion": 1,
  "ids": [
    { "kind": "timeline", "name": "court_intro", "host": { "assetId": 1 } }
  ],
  "actions": [
    { "name": "open_window", "handler": { "kind": "test" } }
  ],
  "events": [
    { "name": "legacy_window", "handler": { "kind": "test" } }
  ],
  "queries": [
    { "name": "player.name", "handler": { "kind": "test" } }
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
@emit open_window 42
Narrator: [player.name] and [player.godl].
""")
                };

                JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
                HostSchemaCapabilityCatalogModel schema = HostSchemaCapabilityCatalogDomain.Read(directory, schemaPath, jsonOptions);
                UsageManifestModel usage = UsageManifestDomain.Inspect(directory, null, sources, schema);
                HostBindingCapabilityCatalogModel bridge = HostBindingCapabilityCatalogDomain.Read(directory, bridgePath, sources);
                HostIntegrationAuditModel audit = HostIntegrationAuditDomain.Audit(directory, null, usage, schema, bridge);

                AssertEqual("inscape.host-integration.audit", audit.Format, "Host integration audit format");
                AssertEqual(2, bridge.Actions.Count, "Host bridge should expose action and legacy event handler names.");
                AssertEqual(1, bridge.Queries.Count, "Host bridge should expose query handler names.");
                AssertEqual(2, audit.Summary.QueryUsageCount, "Audit query usage count");
                AssertEqual(4, audit.Summary.ActionUsageCount, "Audit action usage count");
                AssertEqual(6, audit.Summary.DiagnosticCount, "Audit diagnostic count");
                AssertEqual(5, audit.Summary.ErrorCount, "Audit error count");
                AssertEqual(1, audit.Summary.WarningCount, "Audit warning count");

                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA001", "query", "player.godl"), "Audit should report unknown query.");
                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA003", "action", "legacy_window"), "Audit should report legacy event usage.");
                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA004", "timeline", "mira_reveal"), "Audit should report missing timeline id.");
                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA004", "ui-window", "legacy_panel"), "Audit should report missing legacy window id.");
                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA006", "action", "open_window"), "Audit should report parameter type mismatch.");
                AssertTrue(ContainsHostIntegrationDiagnostic(audit, "HIA007", "action", "play_timeline"), "Audit should report missing action handler.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static bool ContainsHostIntegrationDiagnostic(HostIntegrationAuditModel audit,
                                                     string code,
                                                     string subjectKind,
                                                     string subjectName) {
            for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                HostIntegrationAuditDiagnosticModel diagnostic = audit.Diagnostics[i];
                if (diagnostic.Code == code
                    && diagnostic.SubjectKind == subjectKind
                    && diagnostic.SubjectName == subjectName) {
                    return true;
                }
            }

            return false;
        }

    }
}
