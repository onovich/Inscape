using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class DslScriptProjectDiagnosticProvider {

        readonly StoryGraphCompilerDomain compiler;

        public DslScriptProjectDiagnosticProvider() {
            compiler = new StoryGraphCompilerDomain();
        }

        public List<LanguageServerDiagnosticModel> GetDiagnostics(string rootPath,
                                                                  DslScriptSourceOverrideModel? sourceOverride,
                                                                  string entryOverrideName) {
            string fullRootPath = Path.GetFullPath(rootPath);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(fullRootPath, sourceOverride);
            StoryGraphCompilationResultModel result = compiler.Compile(sources, fullRootPath, entryOverrideName);
            List<LanguageServerDiagnosticModel> diagnostics = new List<LanguageServerDiagnosticModel>();

            foreach (DiagnosticModel diagnostic in result.Diagnostics) {
                diagnostics.Add(new LanguageServerDiagnosticModel {
                    Code = diagnostic.Code,
                    Severity = diagnostic.Severity.ToString(),
                    Message = diagnostic.Message,
                    Location = EditorLocationMapperDomain.FromCompilerSource(new SourceSpanModel(
                        diagnostic.SourcePath,
                        diagnostic.Line,
                        diagnostic.Column))
                });
            }

            return diagnostics;
        }

    }

}
