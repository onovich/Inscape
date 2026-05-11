using System.Text;
using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliSingleFileCompiler {

        public static bool TryCompile(string inputPath,
                                      string[] args,
                                      JsonSerializerOptions jsonOptions,
                                      out ToolConfigModel previewConfig,
                                      out CompilationResult result) {
            previewConfig = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return false;
            }

            string fullInputPath = Path.GetFullPath(inputPath);
            string projectRoot = Path.GetDirectoryName(fullInputPath) ?? Directory.GetCurrentDirectory();
            if (!ToolConfigReaderDomain.TryReadProjectConfig(projectRoot,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out previewConfig,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            string source = File.ReadAllText(inputPath, Encoding.UTF8);
            InscapeCompiler compiler = new InscapeCompiler();
            result = compiler.Compile(source, fullInputPath);
            return true;
        }

        static CompilationResult CreateEmptyResult() {
            return new CompilationResult(new InscapeDocument(), new List<Diagnostic>());
        }

    }

}