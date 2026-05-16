using System.Text;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void HostSchemaEventReaderReportsSchemaEvents() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-host-events-" + Guid.NewGuid().ToString("N"));
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
  "events": [
    {
      "name": "open_window",
      "description": "Open a host UI window.",
      "delivery": "blocking",
      "sideEffects": true,
      "parameters": [
        { "name": "windowId", "type": "string", "required": true }
      ]
    },
    {
      "name": "open_window",
      "description": "Duplicate should be ignored."
    },
    {
      "name": "play.timeline",
      "parameters": []
    }
  ]
}
""", Encoding.UTF8);

                HostSchemaEventReadResultModel result = HostSchemaEventReaderDomain.Read(schemaPath, new JsonSerializerOptions(JsonSerializerDefaults.Web));

                AssertTrue(result.Loaded, "Host Schema events should load.");
                AssertEqual(2, result.Events.Count, "Host Schema event count");
                AssertEqual("open_window", result.Events[0].Name, "First event name");
                AssertEqual("blocking", result.Events[0].Delivery, "First event delivery");
                AssertTrue(result.Events[0].SideEffects, "First event side effects");
                AssertEqual(1, result.Events[0].Parameters.Count, "First event parameter count");
                AssertEqual(schemaPath, result.Events[0].SourcePath, "First event source path");
                AssertTrue(result.Events[0].Line > 0, "First event line should be 1-based.");
                AssertTrue(result.Events[0].Column > 0, "First event column should be 1-based.");
                AssertEqual("play.timeline", result.Events[1].Name, "Second event name");
                AssertEqual("fire-and-forget", result.Events[1].Delivery, "Default event delivery");
                AssertTrue(result.Events[1].IsNamedHostEvent, "Dotted event name should be accepted.");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

    }
}
