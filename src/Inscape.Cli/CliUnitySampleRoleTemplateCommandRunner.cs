using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleRoleTemplateCommandRunner {

        internal static int Run(ProjectCompilationResult result,
                                string[] args,
                                ToolConfigModel config,
                                string? outputPath) {
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
                                     CliUnitySampleRoleTemplateReportWriter.Write(result.Graph,
                                                                                  roleNameScan.RoleIdsBySpeaker,
                                                                                  roleNameScan.CandidatesBySpeaker,
                                                                                  roleNameScan.ScannedRoleNameCsv));
            }

            CliCore.PrintDiagnostics(result.Diagnostics);
            return result.HasErrors ? 1 : 0;
        }

    }

}