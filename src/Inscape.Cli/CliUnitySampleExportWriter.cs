using System.Text;
using System.Text.Json;
using Inscape.Adapters.UnitySample;

namespace Inscape.Cli {

    static class CliUnitySampleExportWriter {

        internal static void Write(string outputDirectory, UnitySampleExportResult export, JsonSerializerOptions jsonOptions) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, jsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-unity-sample-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

    }

}