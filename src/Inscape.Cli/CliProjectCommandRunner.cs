using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Localization;
using Inscape.Adapters.UnitySample;

namespace Inscape.Cli {

    static class CliProjectCommandRunner {

        public static int Run(string command, string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return 1;
            }

            if (!CliConfigLoader.TryReadProjectConfig(rootPath, args, jsonOptions, out CliProjectConfig config)) {
                return 1;
            }
            CliProjectCommandSupport.ProjectOverride? projectOverride = CliProjectCommandSupport.ReadProjectOverride(args);
            string? entryOverrideName = CliCore.ReadOption(args, "--entry");
            List<ProjectSource> sources = CliProjectCommandSupport.ReadProjectSources(rootPath, projectOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return 1;
            }

            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);

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
                    CliCore.WriteOrPrint(outputPath,
                                         CliPreviewHtmlRenderer.Render(CliCore.ToProjectOutput(result),
                                                                       jsonOptions,
                                                                       CliConfigLoader.ReadPreviewStyle(config, jsonOptions)));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "extract-l10n-project":
                    CliCore.WriteOrPrint(outputPath, CliCore.ExtractLocalizationCsv(result.Graph));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "update-l10n-project":
                    if (!CliCore.TryReadPreviousLocalization(CliCore.ReadOption(args, "--from"), out List<LocalizationEntry> previousEntries)) {
                        return 1;
                    }

                    CliCore.WriteOrPrint(outputPath, CliCore.UpdateLocalizationCsv(result.Graph, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "export-unity-sample-binding-template":
                    if (!CliProjectCommandSupport.TryReadUnitySampleTimelineBindingsForTemplate(args, config, out Dictionary<string, UnitySampleTimelineAssetBinding> timelineBindingsByAlias)) {
                        return 1;
                    }

                    UnitySampleBindingTemplateWriter bindingWriter = new UnitySampleBindingTemplateWriter();
                    CliCore.WriteOrPrint(outputPath, bindingWriter.Write(result.Graph, timelineBindingsByAlias));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "export-unity-sample-role-template":
                    if (!CliProjectCommandSupport.TryReadUnitySampleRoleNameBindingsForTemplate(args,
                                                                                                config,
                                                                                                out Dictionary<string, int> roleIdsBySpeaker,
                                                                                                out Dictionary<string, List<CliProjectCommandSupport.UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                                                                out bool scannedRoleNameCsv)) {
                        return 1;
                    }

                    UnitySampleRoleTemplateWriter roleWriter = new UnitySampleRoleTemplateWriter();
                    CliCore.WriteOrPrint(outputPath, roleWriter.Write(result.Graph, roleIdsBySpeaker));
                    string? reportPath = CliCore.ReadOption(args, "--report");
                    if (!string.IsNullOrWhiteSpace(reportPath)) {
                        CliCore.WriteOrPrint(reportPath,
                                             CliProjectCommandSupport.WriteUnitySampleRoleTemplateReport(result.Graph,
                                                                                                        roleIdsBySpeaker,
                                                                                                        candidatesBySpeaker,
                                                                                                        scannedRoleNameCsv));
                    }
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "export-unity-sample-project":
                    if (string.IsNullOrWhiteSpace(outputPath)) {
                        Console.Error.WriteLine("Missing required option: -o <output-directory>");
                        return 1;
                    }

                    UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
                    if (!CliProjectCommandSupport.TryReadUnitySampleExportOptions(args, config, out UnitySampleExportOptions options)) {
                        return 1;
                    }

                    UnitySampleExportResult export = exporter.Export(result, options);
                    CliProjectCommandSupport.WriteUnitySampleExport(outputPath, export, jsonOptions);
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
