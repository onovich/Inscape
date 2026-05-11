using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliTopLevelCommand {

        public static bool TryRun(string[] args, JsonSerializerOptions jsonOptions, out int exitCode) {
            exitCode = 0;

            if (args.Length == 0) {
                CliCommandProvider.PrintUsage();
                exitCode = 1;
                return true;
            }

            if (CliCore.IsHelp(args[0])) {
                if (args.Length >= 2 && !CliCore.IsHelp(args[1])) {
                    exitCode = CliCommandProvider.PrintCommandHelp(args[1]) ? 0 : 1;
                    return true;
                }

                CliCommandProvider.PrintUsage();
                exitCode = 0;
                return true;
            }

            if (args[0] == "commands") {
                CliCommandProvider.PrintCommandList();
                exitCode = 0;
                return true;
            }

            if (args[0] == "export-host-schema-template") {
                CliCore.WriteOrPrint(CliCore.ReadOption(args, "-o"), HostSchemaTemplateWriterDomain.Write(jsonOptions));
                exitCode = 0;
                return true;
            }

            if (args.Length < 2) {
                CliCommandProvider.PrintUsage();
                exitCode = 1;
                return true;
            }

            return false;
        }

    }

}