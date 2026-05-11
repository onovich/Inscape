using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;
using Inscape.Tooling;

namespace Inscape.Cli {

    public static class CliCore {

        static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public static int Main(string[] args) {
            if (CliTopLevelCommand.TryRun(args, JsonOptions, out int exitCode)) {
                return exitCode;
            }

            string command = args[0];
            string inputPath = args[1];
            string? outputPath = ReadOption(args, "-o");
            string? previousLocalizationPath = ReadOption(args, "--from");

            if (CliUnitySampleL10nMergeCommand.TryRun(command, inputPath, args, outputPath, out exitCode)) {
                return exitCode;
            }

            if (CliCommandProvider.IsProjectCommand(command)) {
                return RunProjectCommand(command, inputPath, args, outputPath);
            }

            if (CliSingleFileCommand.TryRun(command, inputPath, args, outputPath, previousLocalizationPath, JsonOptions, out exitCode)) {
                return exitCode;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            CliCommandProvider.PrintUsage();
            return 1;
        }

        internal static CliCompileViewModel ToCompileViewModel(CompilationResult result) {
            return new CliCompileViewModel {
                Format = "inscape.graph-ir",
                FormatVersion = 1,
                Document = result.Document,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        internal static CliProjectCompileViewModel ToProjectCompileViewModel(ProjectCompilationResult result) {
            return new CliProjectCompileViewModel {
                Format = "inscape.project-ir",
                FormatVersion = 1,
                RootPath = result.RootPath,
                Documents = result.Documents,
                Graph = result.Graph,
                EntryNodeName = result.EntryNodeName,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        static int RunProjectCommand(string command, string rootPath, string[] args, string? outputPath) {
            return CliProjectCommand.Run(command, rootPath, args, outputPath, JsonOptions);
        }

        internal static void PrintDiagnostics(IReadOnlyList<Diagnostic> diagnostics) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                Diagnostic diagnostic = diagnostics[i];
                Console.Error.WriteLine(diagnostic.SourcePath
                                      + "(" + diagnostic.Line + "," + diagnostic.Column + "): "
                                      + diagnostic.Severity.ToString().ToLowerInvariant()
                                      + " " + diagnostic.Code + ": "
                                      + diagnostic.Message);
            }
        }

        internal static void WriteOrPrint(string? outputPath, string content) {
            if (string.IsNullOrWhiteSpace(outputPath)) {
                Console.WriteLine(content);
                return;
            }

            string fullPath = Path.GetFullPath(outputPath);
            string? directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) {
                Directory.CreateDirectory(directory);
            }
            File.WriteAllText(fullPath, content, Encoding.UTF8);
        }

        internal static string? ReadOption(string[] args, string optionName) {
            for (int i = 0; i < args.Length - 1; i += 1) {
                if (args[i] == optionName) {
                    return args[i + 1];
                }
            }
            return null;
        }

        internal static bool IsHelp(string value) {
            return value == "-h" || value == "--help" || value == "help";
        }

        static JsonSerializerOptions CreateJsonOptions() {
            JsonSerializerOptions options = new JsonSerializerOptions {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            options.Converters.Add(new JsonStringEnumConverter());
            return options;
        }

    }

}
