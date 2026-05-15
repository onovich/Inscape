using System.Collections.Generic;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Compiler.Parsing;

namespace Inscape.Compiler.Compilation {

    public sealed class StoryGraphCompilerDomain {

        public StoryGraphCompilationResultModel Compile(IReadOnlyList<DslScriptSourceModel> sources, string rootPath) {
            return Compile(sources, rootPath, string.Empty);
        }

        public StoryGraphCompilationResultModel Compile(IReadOnlyList<DslScriptSourceModel> sources,
                                                string rootPath,
                                                string entryOverrideName) {
            DslScriptParserDomain parser = new DslScriptParserDomain();
            List<DslScriptDocumentModel> documents = new List<DslScriptDocumentModel>();
            List<DiagnosticModel> diagnostics = new List<DiagnosticModel>();

            for (int i = 0; i < sources.Count; i += 1) {
                DslScriptSourceModel source = sources[i];
                DslScriptCompilationResultModel result = parser.Parse(source.Source, source.SourcePath);
                documents.Add(result.Document);
                diagnostics.AddRange(result.Diagnostics);
            }

            DslScriptDocumentModel graph = MergeDocuments(documents, rootPath);
            StoryGraphCompilationValidatorDomain validator = new StoryGraphCompilationValidatorDomain();
            string entryNodeName = validator.Validate(documents, graph, diagnostics, entryOverrideName);

            return new StoryGraphCompilationResultModel(rootPath, documents, graph, entryNodeName, diagnostics);
        }

        static DslScriptDocumentModel MergeDocuments(List<DslScriptDocumentModel> documents, string rootPath) {
            DslScriptDocumentModel graph = new DslScriptDocumentModel();
            graph.SourcePath = rootPath;

            for (int i = 0; i < documents.Count; i += 1) {
                DslScriptDocumentModel document = documents[i];
                graph.Nodes.AddRange(document.Nodes);
                graph.Edges.AddRange(document.Edges);
            }

            return graph;
        }

    }

}
