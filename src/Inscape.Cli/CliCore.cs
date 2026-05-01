using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;

namespace Inscape.Cli {

    public static class CliCore {

        static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public static int Main(string[] args) {
            if (CliTopLevelCommandRunner.TryRun(args, JsonOptions, out int exitCode)) {
                return exitCode;
            }

            string command = args[0];
            string inputPath = args[1];
            string? outputPath = ReadOption(args, "-o");
            string? previousLocalizationPath = ReadOption(args, "--from");

            if (command == "merge-unity-sample-l10n") {
                return RunMergeUnitySampleL10n(inputPath, previousLocalizationPath, ReadOption(args, "--report"), outputPath);
            }

            if (CliCommandCatalog.IsProjectCommand(command)) {
                return RunProjectCommand(command, inputPath, args, outputPath);
            }

            if (!CliSingleFileCompiler.TryCompile(inputPath, args, JsonOptions, out CliProjectConfig previewConfig, out CompilationResult result)) {
                return 1;
            }

            if (CliSingleFileCommandRunner.TryRun(command, result, outputPath, previousLocalizationPath, previewConfig, JsonOptions, out exitCode)) {
                return exitCode;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            CliCommandCatalog.PrintUsage();
            return 1;
        }

        internal static CliCompileOutput ToOutput(CompilationResult result) {
            return new CliCompileOutput {
                Format = "inscape.graph-ir",
                FormatVersion = 1,
                Document = result.Document,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        internal static CliProjectCompileOutput ToProjectOutput(ProjectCompilationResult result) {
            return new CliProjectCompileOutput {
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
            return CliProjectCommandRunner.Run(command, rootPath, args, outputPath, JsonOptions);
        }

        internal static string ExtractLocalizationCsv(Inscape.Core.Model.InscapeDocument document) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(extractor.Extract(document));
        }

        internal static string UpdateLocalizationCsv(Inscape.Core.Model.InscapeDocument document,
                                            IReadOnlyList<LocalizationEntry> previousEntries) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationMerger merger = new LocalizationMerger();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(merger.Merge(extractor.Extract(document), previousEntries), true);
        }

        internal static bool TryReadPreviousLocalization(string? previousLocalizationPath, out List<LocalizationEntry> entries) {
            entries = new List<LocalizationEntry>();
            if (string.IsNullOrWhiteSpace(previousLocalizationPath)) {
                Console.Error.WriteLine("Missing required option: --from <old.csv>");
                return false;
            }

            if (!File.Exists(previousLocalizationPath)) {
                Console.Error.WriteLine("Previous localization CSV not found: " + previousLocalizationPath);
                return false;
            }

            LocalizationCsvReader reader = new LocalizationCsvReader();
            entries = reader.Read(File.ReadAllText(previousLocalizationPath, Encoding.UTF8));
            return true;
        }

        static int RunMergeUnitySampleL10n(string generatedPath, string? existingPath, string? reportPath, string? outputPath) {
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
                WriteOrPrint(outputPath, result.MergedCsv);
                if (!string.IsNullOrWhiteSpace(reportPath)) {
                    WriteOrPrint(reportPath, result.ReportCsv);
                }
                return 0;
            } catch (Exception ex) {
                Console.Error.WriteLine(ex.Message);
                return 1;
            }
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
