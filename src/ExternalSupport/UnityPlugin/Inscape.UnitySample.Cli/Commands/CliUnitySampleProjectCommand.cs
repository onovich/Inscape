using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.UnitySample.Cli {

    static class CliUnitySampleProjectCommand {

        internal static bool TryRun(string command,
                                    StoryGraphCompilationResultModel result,
                                    string[] args,
                                    ToolConfigModel config,
                                    string? outputPath,
                                    JsonSerializerOptions jsonOptions,
                                    out int exitCode) {
            switch (command) {
                case "export-unity-sample-binding-template":
                    exitCode = CliUnitySampleBindingTemplateCommand.Run(result, args, config, outputPath);
                    return true;

                case "export-unity-sample-role-template":
                    exitCode = CliUnitySampleRoleTemplateCommand.Run(result, args, config, outputPath);
                    return true;

                case "export-unity-sample-project":
                    exitCode = CliUnitySampleProjectExportCommand.Run(result, args, config, outputPath, jsonOptions);
                    return true;

                default:
                    exitCode = 0;
                    return false;
            }
        }

    }

}
