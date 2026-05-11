using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Localization;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliProjectCommand {

        public static int Run(string command, string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!CliCompilerProject.TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out ProjectCompilationResult result)) {
                return 1;
            }

            if (CliUnitySampleProjectCommand.TryRun(command, result, args, config, outputPath, jsonOptions, out int unitySampleExitCode)) {
                return unitySampleExitCode;
            }

            switch (command) {
                case "check-project":
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "diagnose-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CliCore.ToProjectOutput(result), jsonOptions));
                    return 0;

                case "compile-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CliCore.ToProjectOutput(result), jsonOptions));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "preview-project":
                    PreviewStyleSheetModel previewStyle = PreviewStyleReaderDomain.Read(config.Styles.Preview, jsonOptions, out string? previewStyleError);
                    if (!string.IsNullOrWhiteSpace(previewStyleError)) {
                        Console.Error.WriteLine(previewStyleError);
                    }

                    CliCore.WriteOrPrint(outputPath,
                                         CliPreviewHtmlRenderer.Render(CliCore.ToProjectOutput(result),
                                                                       jsonOptions,
                                                                       previewStyle));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "extract-l10n-project":
                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Extract(result.Graph));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "update-l10n-project":
                    if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(CliCore.ReadOption(args, "--from"), out List<LocalizationEntry> previousEntries, out string? localizationError)) {
                        Console.Error.WriteLine(localizationError);
                        return 1;
                    }

                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Update(result.Graph, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                default:
                    Console.Error.WriteLine("Unknown project command: " + command);
                    CliCommandCatalog.PrintUsage();
                    return 1;
            }
        }

    }

}