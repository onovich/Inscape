using Inscape.Core.Compilation;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleBindingTemplateCommandRunner {

        internal static int Run(ProjectCompilationResult result,
                                string[] args,
                                ToolConfigModel config,
                                string? outputPath) {
            if (!CliUnitySampleTemplateBindingReader.TryRead(args, config, out Dictionary<string, TimelineAssetBindingModel> timelineBindingsByAlias)) {
                return 1;
            }

            CliCore.WriteOrPrint(outputPath, CliUnitySampleBindingTemplateWriter.Write(result.Graph, timelineBindingsByAlias));
            CliCore.PrintDiagnostics(result.Diagnostics);
            return result.HasErrors ? 1 : 0;
        }

    }

}