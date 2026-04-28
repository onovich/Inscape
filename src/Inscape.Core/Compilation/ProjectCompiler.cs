using System.Collections.Generic;
using Inscape.Core.Analysis;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using Inscape.Core.Parsing;

namespace Inscape.Core.Compilation {

    public sealed class ProjectCompiler {

        public ProjectCompilationResult Compile(IReadOnlyList<ProjectSource> sources, string rootPath) {
            InscapeParser parser = new InscapeParser();
            List<InscapeDocument> documents = new List<InscapeDocument>();
            List<Diagnostic> diagnostics = new List<Diagnostic>();

            for (int i = 0; i < sources.Count; i += 1) {
                ProjectSource source = sources[i];
                CompilationResult result = parser.Parse(source.Source, source.SourcePath);
                documents.Add(result.Document);
                diagnostics.AddRange(result.Diagnostics);
            }

            InscapeDocument graph = MergeDocuments(documents, rootPath);
            ProjectGraphValidator validator = new ProjectGraphValidator();
            validator.Validate(documents, graph, diagnostics);

            return new ProjectCompilationResult(rootPath, documents, graph, diagnostics);
        }

        static InscapeDocument MergeDocuments(List<InscapeDocument> documents, string rootPath) {
            InscapeDocument graph = new InscapeDocument();
            graph.SourcePath = rootPath;

            for (int i = 0; i < documents.Count; i += 1) {
                InscapeDocument document = documents[i];
                graph.Nodes.AddRange(document.Nodes);
                graph.Edges.AddRange(document.Edges);
            }

            return graph;
        }

    }

}
