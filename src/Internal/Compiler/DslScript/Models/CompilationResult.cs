using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Compilation {

    public sealed class CompilationResult {

        public InscapeDocument Document { get; set; }

        public List<Diagnostic> Diagnostics { get; set; }

        public bool HasErrors {
            get {
                for (int i = 0; i < Diagnostics.Count; i += 1) {
                    if (Diagnostics[i].Severity == DiagnosticSeverity.Error) {
                        return true;
                    }
                }
                return false;
            }
        }

        public CompilationResult(InscapeDocument document, List<Diagnostic> diagnostics) {
            Document = document;
            Diagnostics = diagnostics;
        }

    }

}
