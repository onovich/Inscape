using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void QueryInterpolationAuditReportsHostSchemaHints() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-query-audit-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                string schemaPath = Path.Combine(configDirectory, "inscape.host.schema.json");
                File.WriteAllText(schemaPath, """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    {
      "name": "player.gold",
      "returnType": "number",
      "isAsync": false,
      "description": "Current gold.",
      "parameters": []
    },
    {
      "name": "has_item",
      "returnType": "bool",
      "isAsync": false,
      "parameters": [
        { "name": "itemId", "type": "string", "required": true }
      ]
    }
  ]
}
""", Encoding.UTF8);

                ToolConfigModel config = new ToolConfigModel {
                    HostSchema = schemaPath
                };

                List<DslScriptSourceModel> sources = new List<DslScriptSourceModel> {
                    new DslScriptSourceModel(Path.Combine(directory, "story.inscape"), """
# start
旁白：金币 [player.gold]，物品 [has_item]，未知 [player.godl]。
@timeline.talking.exit court_intro
旁白：带冒号的 metadata [note: court_intro] 不应算 query。
""")
                };

                HostSchemaQueryReadResultModel readResult = HostSchemaQueryReaderDomain.Read(schemaPath, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                QueryInterpolationAuditModel audit = QueryInterpolationAuditDomain.Audit(directory, config, sources, readResult);

                AssertEqual(3, audit.Summary.InterpolationCount, "Audit interpolation count");
                AssertEqual(2, audit.Summary.DiagnosticCount, "Audit diagnostic count");
                AssertEqual(1, audit.Summary.UnknownQueryCount, "Audit unknown query count");
                AssertEqual(1, audit.Summary.ParameterizedQueryCount, "Audit parameterized query count");
                AssertTrue(AuditContains(audit, "IQI001", "player.godl"), "Audit should report unknown query.");
                AssertTrue(AuditContains(audit, "IQI002", "has_item"), "Audit should report parameterized query.");
                AssertFalse(AuditContains(audit, "IQI001", "note"), "Colon metadata should not be treated as query.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

        static bool AuditContains(QueryInterpolationAuditModel audit, string code, string query) {
            for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                QueryInterpolationAuditDiagnosticModel diagnostic = audit.Diagnostics[i];
                if (diagnostic.Code == code && diagnostic.Query == query) {
                    return true;
                }
            }

            return false;
        }

    }
}
