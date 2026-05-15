using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliStoryGraphCommand {

        public static int Run(string command, string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out StoryGraphCompilationResultModel result)) {
                return 1;
            }

            switch (command) {
                case "check-project":
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "diagnose-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CreateProjectCompileViewModel(result), jsonOptions));
                    return 0;

                case "compile-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CreateProjectCompileViewModel(result), jsonOptions));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "preview-project":
                    PreviewStyleSheetModel previewStyle = PreviewStyleReaderDomain.Read(config.Styles.Preview, jsonOptions, out string? previewStyleError);
                    if (!string.IsNullOrWhiteSpace(previewStyleError)) {
                        Console.Error.WriteLine(previewStyleError);
                    }

                    CliCore.WriteOrPrint(outputPath,
                                         PreviewHtmlRendererDomain.Render(CreateProjectCompileViewModel(result),
                                                                       jsonOptions,
                                                                       previewStyle));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "extract-l10n-project":
                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Extract(result.Graph));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "update-l10n-project":
                    if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(CliCore.ReadOption(args, "--from"), out List<LocalizationEntryModel> previousEntries, out string? localizationError)) {
                        Console.Error.WriteLine(localizationError);
                        return 1;
                    }

                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Update(result.Graph, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                default:
                    Console.Error.WriteLine("Unknown project command: " + command);
                    CliCommandProvider.PrintUsage();
                    return 1;
            }
        }

        static bool TryCompile(string rootPath,
                               string[] args,
                               JsonSerializerOptions jsonOptions,
                               out ToolConfigModel config,
                               out StoryGraphCompilationResultModel result) {
            config = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return false;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            DslScriptSourceOverrideModel? sourceOverride = ReadSourceOverride(args);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(rootPath, sourceOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return false;
            }

            string? entryOverrideName = CliCore.ReadOption(args, "--entry");
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);
            return true;
        }

        static StoryGraphCompilationResultModel CreateEmptyResult() {
            return new StoryGraphCompilationResultModel(string.Empty,
                                                new List<DslScriptDocumentModel>(),
                                                new DslScriptDocumentModel(),
                                                string.Empty,
                                                new List<DiagnosticModel>());
        }

        static DslScriptSourceOverrideModel? ReadSourceOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new DslScriptSourceOverrideModel(args[i + 1], args[i + 2]);
                }
            }

            return null;
        }

        static CliStoryGraphCompileViewModel CreateProjectCompileViewModel(StoryGraphCompilationResultModel result) {
            return new CliStoryGraphCompileViewModel {
                Format = "inscape.project-ir",
                FormatVersion = 1,
                RootPath = result.RootPath,
                Documents = result.Documents,
                Graph = result.Graph,
                EntryNodeName = result.EntryNodeName,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

    }

}
