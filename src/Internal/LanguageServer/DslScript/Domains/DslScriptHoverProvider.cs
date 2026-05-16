using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public sealed class DslScriptHoverProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptHoverProvider() {
            compiler = new DslScriptCompilerDomain();
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

    }

}
