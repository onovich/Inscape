using System.Text.Json;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliProjectCompiler {

        public static bool TryCompile(string rootPath,
                                      string[] args,
                                      JsonSerializerOptions jsonOptions,
                                      out ToolConfigModel config,
                                      out ProjectCompilationResult result) {
            config = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return false;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            CliDslSourceLoader.DslSourceOverride? sourceOverride = CliDslSourceLoader.ReadOverride(args);
            List<ProjectSource> sources = CliDslSourceLoader.LoadProjectSources(rootPath, sourceOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return false;
            }

            string? entryOverrideName = CliCore.ReadOption(args, "--entry");
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

    }

}