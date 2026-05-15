using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Compilation {

    public sealed class StoryGraphCompilationResultModel {

        public string RootPath { get; set; }

        public List<DslScriptDocumentModel> Documents { get; set; }

        public DslScriptDocumentModel Graph { get; set; }

        public string EntryNodeName { get; set; }

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

        public StoryGraphCompilationResultModel(string rootPath,
                                        List<DslScriptDocumentModel> documents,
                                        DslScriptDocumentModel graph,
                                        string entryNodeName,
                                        List<DiagnosticModel> diagnostics) {
            RootPath = rootPath;
            Documents = documents;
            Graph = graph;
            EntryNodeName = entryNodeName;
            Diagnostics = diagnostics;
        }

    }

}
