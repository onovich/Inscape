using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Localization;

namespace Inscape.Cli {

    static class CliSingleFileCommandRunner {

        public static bool TryRun(string command,
                                  CompilationResult result,
                                  string? outputPath,
                                  string? previousLocalizationPath,
                                  CliProjectConfig previewConfig,
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
                    CliCore.WriteOrPrint(outputPath,
                                         CliPreviewHtmlRenderer.Render(output,
                                                                       jsonOptions,
                                                                       CliConfigLoader.ReadPreviewStyle(previewConfig, jsonOptions)));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "extract-l10n":
                    CliCore.WriteOrPrint(outputPath, CliCore.ExtractLocalizationCsv(result.Document));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "update-l10n":
                    if (!CliCore.TryReadPreviousLocalization(previousLocalizationPath, out List<LocalizationEntry> previousEntries)) {
                        exitCode = 1;
                        return true;
                    }

                    CliCore.WriteOrPrint(outputPath, CliCore.UpdateLocalizationCsv(result.Document, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                default:
                    return false;
            }
        }

    }

}