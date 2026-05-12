using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.UnitySample.Cli {

    public static class UnitySampleCli {

        static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public static int Main(string[] args) {
            if (args.Length == 0 || args[0] == "help" || args[0] == "--help" || args[0] == "-h") {
                PrintUsage();
                return 0;
            }

            if (args[0] == "commands") {
                PrintCommands();
                return 0;
            }

            if (args.Length < 2) {
                PrintUsage();
                return 1;
            }

            string command = args[0];
            string inputPath = args[1];
            string? outputPath = ReadOption(args, "-o");

            if (CliUnitySampleL10nMergeCommand.TryRun(command, inputPath, args, outputPath, out int exitCode)) {
                return exitCode;
            }

            if (!TryCompile(inputPath, args, out ToolConfigModel config, out ProjectCompilationResult result)) {
                return 1;
            }

            if (CliUnitySampleProjectCommand.TryRun(command, result, args, config, outputPath, JsonOptions, out exitCode)) {
                return exitCode;
            }

            Console.Error.WriteLine("Unknown UnitySample command: " + command);
            PrintUsage();
            return 1;
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

        static bool TryCompile(string rootPath,
                               string[] args,
                               out ToolConfigModel config,
                               out ProjectCompilationResult result) {
            config = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return false;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             ReadOption(args, "--config"),
                                                             JsonOptions,
                                                             out config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            ProjectSourceOverrideModel? sourceOverride = ReadSourceOverride(args);
            List<ProjectSource> sources = ProjectSourcesLoaderDomain.LoadProjectSources(rootPath, sourceOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return false;
            }

            string? entryOverrideName = ReadOption(args, "--entry");
            ProjectCompiler compiler = new ProjectCompiler();
            result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);
            return true;
        }

        static ProjectCompilationResult CreateEmptyResult() {
            return new ProjectCompilationResult(string.Empty,
                                                new List<InscapeDocument>(),
                                                new InscapeDocument(),
                                                string.Empty,
                                                new List<Diagnostic>());
        }

        static ProjectSourceOverrideModel? ReadSourceOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new ProjectSourceOverrideModel(args[i + 1], args[i + 2]);
                }
            }

            return null;
        }

        static void PrintCommands() {
            Console.WriteLine("UnitySample CLI commands");
            Console.WriteLine();
            Console.WriteLine("  export-unity-sample-role-template");
            Console.WriteLine("  export-unity-sample-binding-template");
            Console.WriteLine("  export-unity-sample-project");
            Console.WriteLine("  merge-unity-sample-l10n");
        }

        static void PrintUsage() {
            Console.WriteLine("Inscape UnitySample CLI");
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  inscape-unity-sample commands");
            Console.WriteLine("  inscape-unity-sample export-unity-sample-role-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-role-name-csv path] [--report report.csv] [-o roles.csv]");
            Console.WriteLine("  inscape-unity-sample export-unity-sample-binding-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-timeline-root path] [-o bindings.csv]");
            Console.WriteLine("  inscape-unity-sample export-unity-sample-project <root> [--config inscape.config.json] [--entry node.name] [--unity-sample-talking-start 100000] [--unity-sample-role-map roles.csv] [--unity-sample-binding-map bindings.csv] [--unity-sample-existing-talking-root path] -o output-dir");
            Console.WriteLine("  inscape-unity-sample merge-unity-sample-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]");
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
