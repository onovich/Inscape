using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public sealed class DslScriptCompletionProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptCompletionProvider() {
            compiler = new DslScriptCompilerDomain();
        }

        public List<LanguageServerCompletionModel> GetNodeCompletions(string source, string sourcePath) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            List<LanguageServerCompletionModel> completions = new List<LanguageServerCompletionModel>();

            foreach (StoryGraphNodeModel node in result.Document.Nodes) {
                completions.Add(new LanguageServerCompletionModel {
                    Label = node.Name,
                    Kind = "node",
                    Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                });
            }

            return completions;
        }

    }

}
