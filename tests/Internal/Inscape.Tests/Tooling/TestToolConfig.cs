using System.Text;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void ToolConfigResolvesHostBridgePath() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tool-config-" + Guid.NewGuid().ToString("N"));
            string configDirectory = Path.Combine(directory, "config");
            Directory.CreateDirectory(configDirectory);
            try {
                string configPath = Path.Combine(directory, "inscape.config.json");
                File.WriteAllText(configPath, """
{
  "hostSchema": "config/inscape.host.schema.json",
  "hostBridge": "config/inscape.host.bridge.json"
}
""", Encoding.UTF8);

                bool ok = ToolConfigReaderDomain.TryReadProjectConfig(directory,
                                                                       null,
                                                                       new JsonSerializerOptions(JsonSerializerDefaults.Web),
                                                                       out ToolConfigModel config,
                                                                       out string? error);

                AssertTrue(ok, "Tool config should read host bridge config.");
                AssertEqual(null, error, "Tool config error");
                AssertEqual(Path.Combine(configDirectory, "inscape.host.schema.json"), config.HostSchema, "Host schema path");
                AssertEqual(Path.Combine(configDirectory, "inscape.host.bridge.json"), config.HostBridge, "Host bridge path");
            } finally {
                if (Directory.Exists(directory)) {
                    Directory.Delete(directory, true);
                }
            }
        }

    }
}
