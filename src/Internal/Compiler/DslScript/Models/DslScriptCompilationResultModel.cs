using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Compilation {

    public sealed class DslScriptCompilationResultModel {

        public DslScriptDocumentModel Document { get; set; }

        public List<DiagnosticModel> Diagnostics { get; set; }

        public bool HasErrors {
            get {
                for (int i = 0; i < Diagnostics.Count; i += 1) {
                    if (Diagnostics[i].Severity == DiagnosticSeverityModel.Error) {
                        return true;
                    }
                }
                return false;
            }
        }

        public DslScriptCompilationResultModel(DslScriptDocumentModel document, List<DiagnosticModel> diagnostics) {
            Document = document;
            Diagnostics = diagnostics;
        }

    }

}
