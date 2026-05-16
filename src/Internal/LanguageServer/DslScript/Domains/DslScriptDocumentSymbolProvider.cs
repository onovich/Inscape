using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public sealed class DslScriptDocumentSymbolProvider {

        readonly DslScriptCompilerDomain compiler;

        public DslScriptDocumentSymbolProvider() {
            compiler = new DslScriptCompilerDomain();
        }

        public List<LanguageServerDocumentSymbolModel> GetDocumentSymbols(string source, string sourcePath) {
            DslScriptCompilationResultModel result = compiler.Compile(source, sourcePath);
            List<LanguageServerDocumentSymbolModel> symbols = new List<LanguageServerDocumentSymbolModel>();

            foreach (StoryGraphNodeModel node in result.Document.Nodes) {
                symbols.Add(new LanguageServerDocumentSymbolModel {
                    Name = node.Name,
                    Kind = "node",
                    Location = EditorLocationMapperDomain.FromCompilerSource(node.Source, node.Name.Length)
                });
            }

            return symbols;
        }

    }

}
