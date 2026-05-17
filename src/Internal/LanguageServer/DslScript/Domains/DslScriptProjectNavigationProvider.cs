using System.Collections.Generic;
using System.IO;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class DslScriptProjectNavigationProvider {

        readonly StoryGraphCompilerDomain compiler;

        public DslScriptProjectNavigationProvider() {
            compiler = new StoryGraphCompilerDomain();
        }

        public LanguageServerDefinitionModel? GetNodeDefinition(string rootPath,
                                                                string nodeName,
                                                                DslScriptSourceOverrideModel? sourceOverride) {
            StoryGraphCompilationResultModel result = CompileProject(rootPath, sourceOverride);
            foreach (StoryGraphNodeModel node in result.Graph.Nodes) {
                if (node.Name == nodeName) {
                    return new LanguageServerDefinitionModel {
                        Name = node.Name,
                        Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                    };
                }
            }

            return null;
        }

        public List<LanguageServerReferenceModel> GetNodeReferences(string rootPath,
                                                                    string nodeName,
                                                                    DslScriptSourceOverrideModel? sourceOverride) {
            StoryGraphCompilationResultModel result = CompileProject(rootPath, sourceOverride);
            List<LanguageServerReferenceModel> references = new List<LanguageServerReferenceModel>();

            foreach (StoryGraphEdgeModel edge in result.Graph.Edges) {
                if (edge.To == nodeName) {
                    references.Add(new LanguageServerReferenceModel {
                        Target = edge.To,
                        Location = EditorLocationMapperDomain.FromCompilerSource(edge.Source, nodeName.Length)
                    });
                }
            }

            return references;
        }

        StoryGraphCompilationResultModel CompileProject(string rootPath, DslScriptSourceOverrideModel? sourceOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(fullRootPath, sourceOverride);
            return compiler.Compile(sources, fullRootPath);
        }

    }

}
