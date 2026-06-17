using System.Text;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void HostSchemaActionReaderReportsSchemaActions() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-host-actions-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            try {
                string schemaPath = Path.Combine(directory, "inscape.host.schema.json");
                File.WriteAllText(schemaPath, """
{
  "format": "inscape.host-schema",
  "formatVersion": 1,
  "queries": [
    {
      "name": "player.gold",
      "returnType": "int",
      "parameters": []
    }
  ],
  "actions": [
    {
      "name": "open_window",
      "description": "Open a host UI window.",
      "mode": "wait",
      "idKind": "ui-window",
      "parameters": [
        { "name": "windowId", "type": "string", "idKind": "ui-window", "required": true }
      ]
    },
    {
      "name": "open_window",
      "description": "Duplicate should be ignored.",
      "mode": "fire",
      "parameters": []
    },
    {
      "name": "play.timeline",
      "mode": "handoff",
      "parameters": []
    }
  ],
  "events": [
    {
      "name": "legacy.window",
      "delivery": "blocking"
    }
  ]
}
""", Encoding.UTF8);

                HostSchemaActionReadResultModel result = HostSchemaActionReaderDomain.Read(schemaPath, new JsonSerializerOptions(JsonSerializerDefaults.Web));

                AssertTrue(result.Loaded, "Host Schema actions should load.");
                AssertEqual(2, result.Actions.Count, "Host Schema action count");
                AssertEqual("open_window", result.Actions[0].Name, "First action name");
                AssertEqual("wait", result.Actions[0].Mode, "First action mode");
                AssertEqual("ui-window", result.Actions[0].IdKind, "First action id kind");
                AssertEqual(1, result.Actions[0].Parameters.Count, "First action parameter count");
                AssertEqual("ui-window", result.Actions[0].Parameters[0].IdKind, "First action parameter id kind");
                AssertEqual(schemaPath, result.Actions[0].SourcePath, "First action source path");
                AssertTrue(result.Actions[0].Line > 0, "First action line should be 1-based.");
                AssertTrue(result.Actions[0].Column > 0, "First action column should be 1-based.");
                AssertEqual("play.timeline", result.Actions[1].Name, "Second action name");
                AssertEqual("handoff", result.Actions[1].Mode, "Second action mode");
                AssertTrue(result.Actions[1].IsNamedHostAction, "Dotted action name should be accepted.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

    }
}
