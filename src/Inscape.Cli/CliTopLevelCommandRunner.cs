using System.Text.Json;

namespace Inscape.Cli {

    static class CliTopLevelCommandRunner {

        public static bool TryRun(string[] args, JsonSerializerOptions jsonOptions, out int exitCode) {
            exitCode = 0;

            if (args.Length == 0) {
                CliCommandCatalog.PrintUsage();
                exitCode = 1;
                return true;
            }

            if (CliCore.IsHelp(args[0])) {
                if (args.Length >= 2 && !CliCore.IsHelp(args[1])) {
                    exitCode = CliCommandCatalog.PrintCommandHelp(args[1]) ? 0 : 1;
                    return true;
                }

                CliCommandCatalog.PrintUsage();
                exitCode = 0;
                return true;
            }

            if (args[0] == "commands") {
                CliCommandCatalog.PrintCommandList();
                exitCode = 0;
                return true;
            }

            if (args[0] == "export-host-schema-template") {
                CliCore.WriteOrPrint(CliCore.ReadOption(args, "-o"), CliHostSchemaTemplateWriter.Write(jsonOptions));
                exitCode = 0;
                return true;
            }

            if (args.Length < 2) {
                CliCommandCatalog.PrintUsage();
                exitCode = 1;
                return true;
            }

            return false;
        }

    }

}