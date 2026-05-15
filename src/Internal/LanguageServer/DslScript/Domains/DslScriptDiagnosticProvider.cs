using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;

namespace Inscape.LanguageServer {

    public sealed class DslScriptDiagnosticProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptDiagnosticProvider() {
            compiler = new DslScriptCompilerDomain();
        }

        public List<LanguageServerDiagnosticModel> GetDiagnostics(string source, string sourcePath) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            List<LanguageServerDiagnosticModel> diagnostics = new List<LanguageServerDiagnosticModel>();

            foreach (DiagnosticModel diagnostic in result.Diagnostics) {
                diagnostics.Add(ToLanguageServerDiagnostic(diagnostic));
            }

            return diagnostics;
        }

        static LanguageServerDiagnosticModel ToLanguageServerDiagnostic(DiagnosticModel diagnostic) {
            return new LanguageServerDiagnosticModel {
                Code = diagnostic.Code,
                Severity = diagnostic.Severity.ToString(),
                Message = diagnostic.Message,
                Location = new EditorLocationModel {
                    SourcePath = diagnostic.SourcePath,
                    Line = ToEditorCoordinate(diagnostic.Line),
                    Character = ToEditorCoordinate(diagnostic.Column),
                    Length = 1
                }
            };
        }

        static int ToEditorCoordinate(int compilerCoordinate) {
            return compilerCoordinate <= 1 ? 0 : compilerCoordinate - 1;
        }

    }

}
