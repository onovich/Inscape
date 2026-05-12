using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Compilation {

    public sealed class ProjectCompilationResult {

        public string RootPath { get; set; }

        public List<InscapeDocument> Documents { get; set; }

        public InscapeDocument Graph { get; set; }

        public string EntryNodeName { get; set; }

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

        public ProjectCompilationResult(string rootPath,
                                        List<InscapeDocument> documents,
                                        InscapeDocument graph,
                                        string entryNodeName,
                                        List<Diagnostic> diagnostics) {
            RootPath = rootPath;
            Documents = documents;
            Graph = graph;
            EntryNodeName = entryNodeName;
            Diagnostics = diagnostics;
        }

    }

}
