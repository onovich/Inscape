using System.Text;
using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using CliProgram = Inscape.Cli.Program;

namespace Inscape.Tests {

    public static partial class Program {

        static CompilationResult Compile(string source) {
            InscapeCompiler compiler = new InscapeCompiler();
            return compiler.Compile(source, "memory://test.inscape");
        }

        static void AddTimelineBinding(UnitySampleExportOptions options, string alias, int UnitySampleId) {
            options.HostBindings.Add(new UnitySampleHostBinding {
                Kind = "timeline",
                Alias = alias,
                UnitySampleId = UnitySampleId,
            });
        }

        static bool ContainsCode(CompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(ProjectCompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(List<Diagnostic> diagnostics, string code) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                if (diagnostics[i].Code == code && diagnostics[i].Severity == DiagnosticSeverity.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsAnyCode(ProjectCompilationResult result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code) {
                    return true;
                }
            }
            return false;
        }

        static int CountDiagnostics(JsonElement root, string code) {
            int count = 0;
            foreach (JsonElement diagnostic in root.GetProperty("diagnostics").EnumerateArray()) {
                if (diagnostic.TryGetProperty("code", out JsonElement codeElement) && codeElement.GetString() == code) {
                    count += 1;
                }
            }
            return count;
        }

        static int CountCsvLines(string csv) {
            int count = 0;
            using StringReader reader = new StringReader(csv);
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Length > 0) {
                    count += 1;
                }
            }
            return count;
        }

        static string FirstDataAnchor(string csv) {
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line = reader.ReadLine();
            if (string.IsNullOrEmpty(line)) {
                throw new InvalidOperationException("CSV does not contain a data row.");
            }

            int comma = line.IndexOf(',');
            if (comma < 0) {
                throw new InvalidOperationException("CSV data row does not contain fields.");
            }

            return line.Substring(0, comma);
        }

        static string RunCliForOutput(string[] args) {
            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliProgram.Main(args);
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            AssertEqual(0, exitCode, "CLI command exit code");
            AssertEqual("", error.ToString().Trim(), "CLI command stderr");
            return output.ToString();
        }

        static void AssertTrue(bool value, string message) {
            if (!value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertFalse(bool value, string message) {
            if (value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertEqual<T>(T expected, T actual, string message) {
            if (!EqualityComparer<T>.Default.Equals(expected, actual)) {
                throw new InvalidOperationException(message + ". Expected: " + expected + ", Actual: " + actual);
            }
        }
    }
}
