using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public sealed class DslScriptReferenceProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptReferenceProvider() {
            compiler = new DslScriptCompilerDomain();
        }

        public List<LanguageServerReferenceModel> GetNodeReferences(string source, string sourcePath, string nodeName) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            List<LanguageServerReferenceModel> references = new List<LanguageServerReferenceModel>();

            foreach (StoryGraphEdgeModel edge in result.Document.Edges) {
                if (edge.To == nodeName) {
                    references.Add(new LanguageServerReferenceModel {
                        Target = edge.To,
                        Location = EditorLocationMapperDomain.FromCompilerSource(edge.Source, nodeName.Length)
                    });
                }
            }

            return references;
        }

    }

}
