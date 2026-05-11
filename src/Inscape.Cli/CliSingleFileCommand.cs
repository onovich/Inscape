using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Localization;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliSingleFileCommand {

        public static bool TryRun(string command,
                                  CompilationResult result,
                                  string? outputPath,
                                  string? previousLocalizationPath,
                                  ToolConfigModel previewConfig,
                                  JsonSerializerOptions jsonOptions,
                                  out int exitCode) {
            exitCode = 0;
            CliCompileOutput output = CliCore.ToOutput(result);

            switch (command) {
                case "check":
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "diagnose":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(output, jsonOptions));
                    return true;

                case "compile":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(output, jsonOptions));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "preview":
                    PreviewStyleSheetModel previewStyle = PreviewStyleReaderDomain.Read(previewConfig.Styles.Preview, jsonOptions, out string? previewStyleError);
                    if (!string.IsNullOrWhiteSpace(previewStyleError)) {
                        Console.Error.WriteLine(previewStyleError);
                    }

                    CliCore.WriteOrPrint(outputPath,
                                         CliPreviewHtmlRenderer.Render(output,
                                                                       jsonOptions,
                                                                       previewStyle));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "extract-l10n":
                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Extract(result.Document));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "update-l10n":
                    if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(previousLocalizationPath, out List<LocalizationEntry> previousEntries, out string? localizationError)) {
                        Console.Error.WriteLine(localizationError);
                        exitCode = 1;
                        return true;
                    }

                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Update(result.Document, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                default:
                    return false;
            }
        }

    }

}