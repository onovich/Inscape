using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleProjectCommandRunner {

        internal static bool TryRun(string command,
                                    ProjectCompilationResult result,
                                    string[] args,
                                    ToolConfigModel config,
                                    string? outputPath,
                                    JsonSerializerOptions jsonOptions,
                                    out int exitCode) {
            switch (command) {
                case "export-unity-sample-binding-template":
                    if (!CliUnitySampleTemplateBindingReader.TryRead(args, config, out Dictionary<string, TimelineAssetBindingModel> timelineBindingsByAlias)) {
                        exitCode = 1;
                        return true;
                    }

                    CliCore.WriteOrPrint(outputPath, CliUnitySampleBindingTemplateWriter.Write(result.Graph, timelineBindingsByAlias));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "export-unity-sample-role-template":
                    if (!RoleNameBindingScanDomain.TryRead(CliCore.ReadOption(args, "--unity-sample-existing-role-name-csv") ?? config.UnitySample.ExistingRoleNameCsv,
                                                         out RoleNameBindingScanResultModel roleNameScan,
                                                         out string? roleNameError)) {
                        Console.Error.WriteLine(roleNameError);
                        exitCode = 1;
                        return true;
                    }

                    UnitySampleRoleTemplateWriter roleWriter = new UnitySampleRoleTemplateWriter();
                    CliCore.WriteOrPrint(outputPath, roleWriter.Write(result.Graph, roleNameScan.RoleIdsBySpeaker));
                    string? reportPath = CliCore.ReadOption(args, "--report");
                    if (!string.IsNullOrWhiteSpace(reportPath)) {
                        CliCore.WriteOrPrint(reportPath,
                                             CliUnitySampleRoleTemplateReportWriter.Write(result.Graph,
                                                                                          roleNameScan.RoleIdsBySpeaker,
                                                                                          roleNameScan.CandidatesBySpeaker,
                                                                                          roleNameScan.ScannedRoleNameCsv));
                    }

                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                case "export-unity-sample-project":
                    if (string.IsNullOrWhiteSpace(outputPath)) {
                        Console.Error.WriteLine("Missing required option: -o <output-directory>");
                        exitCode = 1;
                        return true;
                    }

                    UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
                    if (!CliUnitySampleExportOptionsReader.TryRead(args, config, out UnitySampleExportOptions options)) {
                        exitCode = 1;
                        return true;
                    }

                    UnitySampleExportResult export = exporter.Export(result, options);
                    CliUnitySampleExportWriter.Write(outputPath, export, jsonOptions);
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    exitCode = result.HasErrors ? 1 : 0;
                    return true;

                default:
                    exitCode = 0;
                    return false;
            }
        }

    }

}