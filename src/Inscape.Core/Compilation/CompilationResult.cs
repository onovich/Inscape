using System.Collections.Generic;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Core.Compilation {

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
