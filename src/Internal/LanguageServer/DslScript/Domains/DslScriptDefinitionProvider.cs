using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public sealed class DslScriptDefinitionProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptDefinitionProvider() {
            compiler = new DslScriptCompilerDomain();
        }

        public LanguageServerDefinitionModel? GetNodeDefinition(string source, string sourcePath, string nodeName) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            foreach (StoryGraphNodeModel node in result.Document.Nodes) {
                if (node.Name == nodeName) {
                    return new LanguageServerDefinitionModel {
                        Name = node.Name,
                        Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                    };
                }
            }

            return null;
        }

    }

}
