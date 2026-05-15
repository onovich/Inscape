using System.Collections.Generic;
using Inscape.Compiler.Compilation;

namespace Inscape.Compiler {

    public sealed class CompilerEntry {

        readonly DslScriptCompilerDomain compiler = new DslScriptCompilerDomain();
        readonly StoryGraphCompilerDomain projectCompiler = new StoryGraphCompilerDomain();

        public DslScriptCompilationResultModel CompileDocument(string source, string sourcePath) {
            return compiler.Compile(source, sourcePath);
        }

        public StoryGraphCompilationResultModel CompileProject(IReadOnlyList<DslScriptSourceModel> sources, string rootPath) {
            return projectCompiler.Compile(sources, rootPath);
        }

        public StoryGraphCompilationResultModel CompileProject(IReadOnlyList<DslScriptSourceModel> sources,
                                                       string rootPath,
                                                       string entryOverrideName) {
            return projectCompiler.Compile(sources, rootPath, entryOverrideName);
        }
    }
}
