using System.Collections.Generic;
using System.IO;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class DslScriptCompletionProvider {

        readonly DslScriptCompilerDomain compiler;
        readonly StoryGraphCompilerDomain projectCompiler;

        public DslScriptCompletionProvider() {
            compiler = new DslScriptCompilerDomain();
            projectCompiler = new StoryGraphCompilerDomain();
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

        public List<LanguageServerCompletionModel> GetProjectNodeCompletions(string rootPath,
                                                                             DslScriptSourceOverrideModel? sourceOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(fullRootPath, sourceOverride);
            StoryGraphCompilationResultModel result = projectCompiler.Compile(sources, fullRootPath);
            List<LanguageServerCompletionModel> completions = new List<LanguageServerCompletionModel>();

            foreach (StoryGraphNodeModel node in result.Graph.Nodes) {
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
