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

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return 1;
            }

            string source = File.ReadAllText(inputPath, Encoding.UTF8);
            InscapeCompiler compiler = new InscapeCompiler();
            CompilationResult result = compiler.Compile(source, Path.GetFullPath(inputPath));

            if (command == "check") {
                PrintDiagnostics(result);
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
                PrintDiagnostics(result);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "preview") {
                string html = PreviewHtmlRenderer.Render(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, html);
                PrintDiagnostics(result);
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

        static void PrintDiagnostics(CompilationResult result) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                Diagnostic diagnostic = result.Diagnostics[i];
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

    }

}
