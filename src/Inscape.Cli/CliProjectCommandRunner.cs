using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Localization;
using Inscape.Adapters.UnitySample;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliProjectCommandRunner {

        public static int Run(string command, string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!CliProjectCompiler.TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out ProjectCompilationResult result)) {
                return 1;
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

                case "export-unity-sample-binding-template":
                    if (!CliUnitySampleSupport.TryReadUnitySampleTimelineBindingsForTemplate(args, config, out Dictionary<string, UnitySampleTimelineAssetBinding> timelineBindingsByAlias)) {
                        return 1;
                    }

                    UnitySampleBindingTemplateWriter bindingWriter = new UnitySampleBindingTemplateWriter();
                    CliCore.WriteOrPrint(outputPath, bindingWriter.Write(result.Graph, timelineBindingsByAlias));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "export-unity-sample-role-template":
                    if (!RoleNameBindingScanDomain.TryRead(CliCore.ReadOption(args, "--unity-sample-existing-role-name-csv") ?? config.UnitySample.ExistingRoleNameCsv,
                                                         out RoleNameBindingScanResultModel roleNameScan,
                                                         out string? roleNameError)) {
                        Console.Error.WriteLine(roleNameError);
                        return 1;
                    }

                    UnitySampleRoleTemplateWriter roleWriter = new UnitySampleRoleTemplateWriter();
                    CliCore.WriteOrPrint(outputPath, roleWriter.Write(result.Graph, roleNameScan.RoleIdsBySpeaker));
                    string? reportPath = CliCore.ReadOption(args, "--report");
                    if (!string.IsNullOrWhiteSpace(reportPath)) {
                        CliCore.WriteOrPrint(reportPath,
                                             CliUnitySampleSupport.WriteUnitySampleRoleTemplateReport(result.Graph,
                                                                                                      roleNameScan.RoleIdsBySpeaker,
                                                                                                      roleNameScan.CandidatesBySpeaker,
                                                                                                      roleNameScan.ScannedRoleNameCsv));
                    }
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "export-unity-sample-project":
                    if (string.IsNullOrWhiteSpace(outputPath)) {
                        Console.Error.WriteLine("Missing required option: -o <output-directory>");
                        return 1;
                    }

                    UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
                    if (!CliUnitySampleSupport.TryReadUnitySampleExportOptions(args, config, out UnitySampleExportOptions options)) {
                        return 1;
                    }

                    UnitySampleExportResult export = exporter.Export(result, options);
                    CliUnitySampleSupport.WriteUnitySampleExport(outputPath, export, jsonOptions);
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
