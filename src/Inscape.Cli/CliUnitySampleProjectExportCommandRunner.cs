using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleProjectExportCommandRunner {

        internal static int Run(ProjectCompilationResult result,
                                string[] args,
                                ToolConfigModel config,
                                string? outputPath,
                                JsonSerializerOptions jsonOptions) {
            if (string.IsNullOrWhiteSpace(outputPath)) {
                Console.Error.WriteLine("Missing required option: -o <output-directory>");
                return 1;
            }

            UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
            if (!CliUnitySampleExportOptionsReader.TryRead(args, config, out UnitySampleExportOptions options)) {
                return 1;
            }

            UnitySampleExportResult export = exporter.Export(result, options);
            CliUnitySampleExportWriter.Write(outputPath, export, jsonOptions);
            CliCore.PrintDiagnostics(result.Diagnostics);
            return result.HasErrors ? 1 : 0;
        }

    }

}