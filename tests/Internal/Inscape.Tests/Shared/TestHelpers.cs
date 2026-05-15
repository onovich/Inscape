using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

        static DslScriptCompilationResultModel Compile(string source) {
            DslScriptCompilerDomain compiler = new DslScriptCompilerDomain();
            return compiler.Compile(source, "memory://test.inscape");
        }

        static bool ContainsCode(DslScriptCompilationResultModel result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverityModel.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(StoryGraphCompilationResultModel result, string code) {
            for (int i = 0; i < result.Diagnostics.Count; i += 1) {
                if (result.Diagnostics[i].Code == code && result.Diagnostics[i].Severity == DiagnosticSeverityModel.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsCode(List<DiagnosticModel> diagnostics, string code) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                if (diagnostics[i].Code == code && diagnostics[i].Severity == DiagnosticSeverityModel.Error) {
                    return true;
                }
            }
            return false;
        }

        static bool ContainsAnyCode(StoryGraphCompilationResultModel result, string code) {
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
                exitCode = CliCore.Main(args);
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
