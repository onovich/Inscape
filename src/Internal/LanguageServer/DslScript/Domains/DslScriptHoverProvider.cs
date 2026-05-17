using System.Collections.Generic;
using System.IO;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class DslScriptHoverProvider {

        readonly DslScriptCompilerDomain compiler;
        readonly StoryGraphCompilerDomain projectCompiler;

        public DslScriptHoverProvider() {
            compiler = new DslScriptCompilerDomain();
            projectCompiler = new StoryGraphCompilerDomain();
        }

        public LanguageServerHoverModel? GetNodeHover(string source, string sourcePath, string nodeName) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            foreach (StoryGraphNodeModel node in result.Document.Nodes) {
                if (node.Name == nodeName) {
                    return new LanguageServerHoverModel {
                        Label = node.Name,
                        Kind = "node",
                        Markdown = "**Inscape node** `" + node.Name + "`",
                        Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                    };
                }
            }

            return null;
        }

        public LanguageServerHoverModel? GetJumpHover(string source, string sourcePath, string nodeName) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            foreach (StoryGraphEdgeModel edge in result.Document.Edges) {
                if (edge.To == nodeName) {
                    return new LanguageServerHoverModel {
                        Label = edge.To,
                        Kind = "jump",
                        Markdown = "**Inscape jump target** `" + edge.To + "`",
                        Location = EditorLocationMapperDomain.FromCompilerSource(edge.Source, edge.To.Length)
                    };
                }
            }

            return null;
        }

        public LanguageServerHoverModel? GetProjectNodeHover(string rootPath,
                                                             string nodeName,
                                                             DslScriptSourceOverrideModel? sourceOverride) {
            StoryGraphCompilationResultModel result = CompileProject(rootPath, sourceOverride);
            foreach (StoryGraphNodeModel node in result.Graph.Nodes) {
                if (node.Name == nodeName) {
                    return new LanguageServerHoverModel {
                        Label = node.Name,
                        Kind = "node",
                        Markdown = "**Inscape node** `" + node.Name + "`",
                        Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                    };
                }
            }

            return null;
        }

        public LanguageServerHoverModel? GetProjectJumpHover(string rootPath,
                                                             string nodeName,
                                                             DslScriptSourceOverrideModel? sourceOverride) {
            StoryGraphCompilationResultModel result = CompileProject(rootPath, sourceOverride);
            foreach (StoryGraphEdgeModel edge in result.Graph.Edges) {
                if (edge.To == nodeName) {
                    return new LanguageServerHoverModel {
                        Label = edge.To,
                        Kind = "jump",
                        Markdown = "**Inscape jump target** `" + edge.To + "`",
                        Location = EditorLocationMapperDomain.FromCompilerSource(edge.Source, edge.To.Length)
                    };
                }
            }

            return null;
        }

        StoryGraphCompilationResultModel CompileProject(string rootPath, DslScriptSourceOverrideModel? sourceOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(fullRootPath, sourceOverride);
            return projectCompiler.Compile(sources, fullRootPath);
        }

    }

}
