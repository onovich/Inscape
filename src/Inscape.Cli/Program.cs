using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Core.Bird;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;

namespace Inscape.Cli {

    public static class Program {

        static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public static int Main(string[] args) {
            if (args.Length < 2 || IsHelp(args[0])) {
                PrintUsage();
                return args.Length == 0 ? 1 : 0;
            }

            string command = args[0];
            string inputPath = args[1];
            string? outputPath = ReadOption(args, "-o");
            string? previousLocalizationPath = ReadOption(args, "--from");

            if (IsProjectCommand(command)) {
                return RunProjectCommand(command, inputPath, args, outputPath);
            }

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return 1;
            }

            string source = File.ReadAllText(inputPath, Encoding.UTF8);
            InscapeCompiler compiler = new InscapeCompiler();
            CompilationResult result = compiler.Compile(source, Path.GetFullPath(inputPath));

            if (command == "check") {
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "diagnose") {
                string json = JsonSerializer.Serialize(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                return 0;
            }

            if (command == "compile") {
                string json = JsonSerializer.Serialize(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "preview") {
                string html = PreviewHtmlRenderer.Render(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, html);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "extract-l10n") {
                string csv = ExtractLocalizationCsv(result.Document);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "update-l10n") {
                if (!TryReadPreviousLocalization(previousLocalizationPath, out List<LocalizationEntry> previousEntries)) {
                    return 1;
                }

                string csv = UpdateLocalizationCsv(result.Document, previousEntries);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            PrintUsage();
            return 1;
        }

        static CompileOutput ToOutput(CompilationResult result) {
            return new CompileOutput {
                Format = "inscape.graph-ir",
                FormatVersion = 1,
                Document = result.Document,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        static ProjectCompileOutput ToProjectOutput(ProjectCompilationResult result) {
            return new ProjectCompileOutput {
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
            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return 1;
            }

            ProjectOverride? projectOverride = ReadProjectOverride(args);
            string? entryOverrideName = ReadOption(args, "--entry");
            List<ProjectSource> sources = ReadProjectSources(rootPath, projectOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return 1;
            }

            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);

            if (command == "check-project") {
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "diagnose-project") {
                string json = JsonSerializer.Serialize(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                return 0;
            }

            if (command == "compile-project") {
                string json = JsonSerializer.Serialize(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "preview-project") {
                string html = PreviewHtmlRenderer.Render(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, html);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "extract-l10n-project") {
                string csv = ExtractLocalizationCsv(result.Graph);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "update-l10n-project") {
                if (!TryReadPreviousLocalization(ReadOption(args, "--from"), out List<LocalizationEntry> previousEntries)) {
                    return 1;
                }

                string csv = UpdateLocalizationCsv(result.Graph, previousEntries);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-bird-project") {
                if (string.IsNullOrWhiteSpace(outputPath)) {
                    Console.Error.WriteLine("Missing required option: -o <output-directory>");
                    return 1;
                }

                BirdProjectExporter exporter = new BirdProjectExporter();
                if (!TryReadBirdExportOptions(args, out BirdExportOptions options)) {
                    return 1;
                }
                BirdExportResult export = exporter.Export(result, options);
                WriteBirdExport(outputPath, export);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            PrintUsage();
            return 1;
        }

        static List<ProjectSource> ReadProjectSources(string rootPath, ProjectOverride? projectOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            string? overrideSourcePath = projectOverride == null ? null : Path.GetFullPath(projectOverride.SourcePath);
            string? overrideContentPath = projectOverride == null ? null : Path.GetFullPath(projectOverride.ContentPath);
            List<ProjectSource> sources = new List<ProjectSource>();
            bool overrideWasMatched = false;

            IEnumerable<string> files = Directory.EnumerateFiles(fullRootPath, "*.inscape", SearchOption.AllDirectories)
                                                .Where(path => !IsExcludedProjectPath(fullRootPath, path))
                                                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase);

            foreach (string file in files) {
                string fullPath = Path.GetFullPath(file);
                if (overrideContentPath != null && IsSamePath(fullPath, overrideContentPath)) {
                    continue;
                }

                if (overrideSourcePath != null && IsSamePath(fullPath, overrideSourcePath)) {
                    sources.Add(new ProjectSource(overrideSourcePath, File.ReadAllText(projectOverride!.ContentPath, Encoding.UTF8)));
                    overrideWasMatched = true;
                } else {
                    sources.Add(new ProjectSource(fullPath, File.ReadAllText(fullPath, Encoding.UTF8)));
                }
            }

            if (projectOverride != null && !overrideWasMatched) {
                sources.Add(new ProjectSource(overrideSourcePath!, File.ReadAllText(projectOverride.ContentPath, Encoding.UTF8)));
            }

            return sources;
        }

        static bool IsExcludedProjectPath(string rootPath, string filePath) {
            string relative = Path.GetRelativePath(rootPath, filePath);
            string[] parts = relative.Split(new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar });
            for (int i = 0; i < parts.Length; i += 1) {
                string part = parts[i];
                if (part == ".git" || part == "bin" || part == "obj" || part == "node_modules" || part == "artifacts") {
                    return true;
                }
            }
            return false;
        }

        static ProjectOverride? ReadProjectOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new ProjectOverride(args[i + 1], args[i + 2]);
                }
            }
            return null;
        }

        static bool IsProjectCommand(string command) {
            return command == "check-project"
                || command == "diagnose-project"
                || command == "compile-project"
                || command == "preview-project"
                || command == "extract-l10n-project"
                || command == "update-l10n-project"
                || command == "export-bird-project";
        }

        static string ExtractLocalizationCsv(Inscape.Core.Model.InscapeDocument document) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(extractor.Extract(document));
        }

        static string UpdateLocalizationCsv(Inscape.Core.Model.InscapeDocument document,
                                            IReadOnlyList<LocalizationEntry> previousEntries) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationMerger merger = new LocalizationMerger();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(merger.Merge(extractor.Extract(document), previousEntries), true);
        }

        static bool TryReadPreviousLocalization(string? previousLocalizationPath, out List<LocalizationEntry> entries) {
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

        static bool IsSamePath(string left, string right) {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
        }

        static void PrintDiagnostics(IReadOnlyList<Diagnostic> diagnostics) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                Diagnostic diagnostic = diagnostics[i];
                Console.Error.WriteLine(diagnostic.SourcePath
                                      + "(" + diagnostic.Line + "," + diagnostic.Column + "): "
                                      + diagnostic.Severity.ToString().ToLowerInvariant()
                                      + " " + diagnostic.Code + ": "
                                      + diagnostic.Message);
            }
        }

        static void WriteOrPrint(string? outputPath, string content) {
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

        static void WriteBirdExport(string outputDirectory, BirdExportResult export) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "bird-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, JsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-bird-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
        }

        static bool TryReadBirdExportOptions(string[] args, out BirdExportOptions options) {
            options = new BirdExportOptions {
                TalkingIdStart = ReadIntOption(args, "--bird-talking-start", 100000),
            };

            string? roleMapPath = ReadOption(args, "--bird-role-map");
            if (string.IsNullOrWhiteSpace(roleMapPath)) {
                return true;
            }

            if (!File.Exists(roleMapPath)) {
                Console.Error.WriteLine("Bird role map not found: " + roleMapPath);
                return false;
            }

            string[] lines = File.ReadAllLines(roleMapPath, Encoding.UTF8);
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) {
                    continue;
                }
                if (i == 0 && line.Equals("speaker,roleId", StringComparison.OrdinalIgnoreCase)) {
                    continue;
                }

                int commaIndex = line.LastIndexOf(',');
                if (commaIndex <= 0 || commaIndex == line.Length - 1) {
                    Console.Error.WriteLine("Invalid Bird role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                string speaker = UnquoteCsvField(line.Substring(0, commaIndex).Trim());
                string roleIdText = UnquoteCsvField(line.Substring(commaIndex + 1).Trim());
                if (speaker.Length == 0 || !int.TryParse(roleIdText, out int roleId)) {
                    Console.Error.WriteLine("Invalid Bird role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                options.RoleIdsBySpeaker[speaker] = roleId;
            }

            return true;
        }

        static string UnquoteCsvField(string value) {
            if (value.Length >= 2 && value[0] == '"' && value[value.Length - 1] == '"') {
                return value.Substring(1, value.Length - 2).Replace("\"\"", "\"");
            }
            return value;
        }

        static string? ReadOption(string[] args, string optionName) {
            for (int i = 0; i < args.Length - 1; i += 1) {
                if (args[i] == optionName) {
                    return args[i + 1];
                }
            }
            return null;
        }

        static int ReadIntOption(string[] args, string optionName, int fallback) {
            string? value = ReadOption(args, optionName);
            if (string.IsNullOrWhiteSpace(value)) {
                return fallback;
            }
            if (int.TryParse(value, out int parsed)) {
                return parsed;
            }
            return fallback;
        }

        static bool IsHelp(string value) {
            return value == "-h" || value == "--help" || value == "help";
        }

        static void PrintUsage() {
            Console.WriteLine("Inscape CLI");
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  inscape check <file.inscape>");
            Console.WriteLine("  inscape diagnose <file.inscape> [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n <file.inscape> [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]");
            Console.WriteLine("  inscape check-project <root> [--entry node.name]");
            Console.WriteLine("  inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape export-bird-project <root> [--entry node.name] [--bird-talking-start 100000] [--bird-role-map roles.csv] -o output-dir");
            Console.WriteLine("  inscape compile-project <root> [--entry node.name] [-o output.json]");
            Console.WriteLine("  inscape preview-project <root> [--entry node.name] [-o preview.html]");
            Console.WriteLine("  inscape compile <file.inscape> [-o output.json]");
            Console.WriteLine("  inscape preview <file.inscape> [-o preview.html]");
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

        sealed class ProjectOverride {

            public string SourcePath { get; }

            public string ContentPath { get; }

            public ProjectOverride(string sourcePath, string contentPath) {
                SourcePath = sourcePath;
                ContentPath = contentPath;
            }

        }

    }

}
