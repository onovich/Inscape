using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;

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
            List<ProjectSource> sources = ReadProjectSources(rootPath, projectOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return 1;
            }

            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(sources, Path.GetFullPath(rootPath));

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
            return command == "check-project" || command == "diagnose-project" || command == "compile-project";
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

        static string? ReadOption(string[] args, string optionName) {
            for (int i = 0; i < args.Length - 1; i += 1) {
                if (args[i] == optionName) {
                    return args[i + 1];
                }
            }
            return null;
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
            Console.WriteLine("  inscape check-project <root>");
            Console.WriteLine("  inscape diagnose-project <root> [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape compile-project <root> [-o output.json]");
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
