using System.Text;
using Inscape.Adapters.UnitySample;

namespace Inscape.Cli {

    static class CliUnitySampleL10nMergeCommand {

        internal static bool TryRun(string command,
                                    string generatedPath,
                                    string[] args,
                                    string? outputPath,
                                    out int exitCode) {
            if (command != "merge-unity-sample-l10n") {
                exitCode = 0;
                return false;
            }

            exitCode = Run(generatedPath,
                           CliCore.ReadOption(args, "--from"),
                           CliCore.ReadOption(args, "--report"),
                           outputPath);
            return true;
        }

        static int Run(string generatedPath, string? existingPath, string? reportPath, string? outputPath) {
            if (!File.Exists(generatedPath)) {
                Console.Error.WriteLine("Generated UnitySample L10N CSV not found: " + generatedPath);
                return 1;
            }

            if (string.IsNullOrWhiteSpace(existingPath)) {
                Console.Error.WriteLine("Missing required option: --from <existing-L10N_Talking.csv>");
                return 1;
            }

            if (!File.Exists(existingPath)) {
                Console.Error.WriteLine("Existing UnitySample L10N CSV not found: " + existingPath);
                return 1;
            }

            try {
                UnitySampleL10nMergePlanner planner = new UnitySampleL10nMergePlanner();
                UnitySampleL10nMergeResult result = planner.Merge(File.ReadAllText(existingPath, Encoding.UTF8),
                                                                  File.ReadAllText(generatedPath, Encoding.UTF8));
                CliCore.WriteOrPrint(outputPath, result.MergedCsv);
                if (!string.IsNullOrWhiteSpace(reportPath)) {
                    CliCore.WriteOrPrint(reportPath, result.ReportCsv);
                }
                return 0;
            } catch (Exception ex) {
                Console.Error.WriteLine(ex.Message);
                return 1;
            }
        }

    }

}