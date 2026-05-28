using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliDslScriptCommand {

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

            if (!TryCompile(inputPath, args, jsonOptions, out ToolConfigModel previewConfig, out DslScriptCompilationResultModel result)) {
                exitCode = 1;
                return true;
            }

            CliCompileViewModel viewModel = CreateCompileViewModel(result);

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
                    if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(previousLocalizationPath, out List<LocalizationEntryModel> previousEntries, out string? localizationError)) {
                        Console.Error.WriteLine(localizationError);
                        exitCode = 1;
                        return true;
                    }

                    if (!CliStoryGraphCommand.TryApplyTranslationOverrides(args, jsonOptions, ref previousEntries, out string? overridesError)) {
                        Console.Error.WriteLine(overridesError);
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
                               out DslScriptCompilationResultModel result) {
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
            DslScriptCompilerDomain compiler = new DslScriptCompilerDomain();
            result = compiler.Compile(source, fullInputPath);
            return true;
        }

        static DslScriptCompilationResultModel CreateEmptyResult() {
            return new DslScriptCompilationResultModel(new DslScriptDocumentModel(), new List<DiagnosticModel>());
        }

        static CliCompileViewModel CreateCompileViewModel(DslScriptCompilationResultModel result) {
            return new CliCompileViewModel {
                Format = "inscape.graph-ir",
                FormatVersion = 1,
                Document = result.Document,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

    }

}
