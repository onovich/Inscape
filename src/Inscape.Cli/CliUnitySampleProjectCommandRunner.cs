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
                    exitCode = CliUnitySampleRoleTemplateCommandRunner.Run(result, args, config, outputPath);
                    return true;

                case "export-unity-sample-project":
                    exitCode = CliUnitySampleProjectExportCommandRunner.Run(result, args, config, outputPath, jsonOptions);
                    return true;

                default:
                    exitCode = 0;
                    return false;
            }
        }

    }

}