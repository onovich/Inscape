using System.Text;
using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Cli {

    static class CliSingleFileCompiler {

        public static bool TryCompile(string inputPath,
                                      string[] args,
                                      JsonSerializerOptions jsonOptions,
                                      out CliProjectConfig previewConfig,
                                      out CompilationResult result) {
            previewConfig = new CliProjectConfig();
            result = CreateEmptyResult();

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return false;
            }

            string fullInputPath = Path.GetFullPath(inputPath);
            string projectRoot = Path.GetDirectoryName(fullInputPath) ?? Directory.GetCurrentDirectory();
            if (!CliConfigLoader.TryReadProjectConfig(projectRoot, args, jsonOptions, out previewConfig)) {
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