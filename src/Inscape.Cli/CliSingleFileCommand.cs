using System.Text;
using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliSingleFileCommand {

        public static bool TryRun(string command,
                                  string inputPath,
                                  string[] args,
                                  string? outputPath,
                                  string? previousLocalizationPath,
                                  JsonSerializerOptions jsonOptions,
                                  out int exitCode) {
            exitCode = 0;
            if (!IsSupported(command)) {
                return false;
            }

            if (!TryCompile(inputPath, args, jsonOptions, out ToolConfigModel previewConfig, out CompilationResult result)) {
                exitCode = 1;
                return true;
            }

            CliCompileViewModel viewModel = CliCore.ToCompileViewModel(result);

            switch (command) {
                case "check":
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "diagnose":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(viewModel, jsonOptions));
                    return true;

                case "compile":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(viewModel, jsonOptions));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "preview":
                    PreviewStyleSheetModel previewStyle = PreviewStyleReaderDomain.Read(previewConfig.Styles.Preview, jsonOptions, out string? previewStyleError);
                    if (!string.IsNullOrWhiteSpace(previewStyleError)) {
                        Console.Error.WriteLine(previewStyleError);
                    }

                    CliCore.WriteOrPrint(outputPath,
                                         PreviewHtmlRendererDomain.Render(viewModel,
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

        static bool IsSupported(string command) {
            switch (command) {
                case "check":
                case "diagnose":
                case "compile":
                case "preview":
                case "extract-l10n":
                case "update-l10n":
                    return true;

                default:
                    return false;
            }
        }

        static bool TryCompile(string inputPath,
                               string[] args,
                               JsonSerializerOptions jsonOptions,
                               out ToolConfigModel previewConfig,
                               out CompilationResult result) {
            previewConfig = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return false;
            }

            string fullInputPath = Path.GetFullPath(inputPath);
            string projectRoot = Path.GetDirectoryName(fullInputPath) ?? Directory.GetCurrentDirectory();
            if (!ToolConfigReaderDomain.TryReadProjectConfig(projectRoot,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out previewConfig,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            string source = File.ReadAllText(inputPath, Encoding.UTF8);
            InscapeCompiler compiler = new InscapeCompiler();
            result = compiler.Compile(source, fullInputPath);
            return true;
        }

        static CompilationResult CreateEmptyResult() {
            return new CompilationResult(new InscapeDocument(), new List<Diagnostic>());
        }

    }

}