using System.Collections.Generic;
using Inscape.Core.Compilation;

namespace Inscape.Core {

    public sealed class InscapeCore {

        readonly InscapeCompiler compiler = new InscapeCompiler();
        readonly ProjectCompiler projectCompiler = new ProjectCompiler();

        public CompilationResult CompileDocument(string source, string sourcePath) {
            return compiler.Compile(source, sourcePath);
        }

        public ProjectCompilationResult CompileProject(IReadOnlyList<ProjectSource> sources, string rootPath) {
            return projectCompiler.Compile(sources, rootPath);
        }

        public ProjectCompilationResult CompileProject(IReadOnlyList<ProjectSource> sources,
                                                       string rootPath,
                                                       string entryOverrideName) {
            return projectCompiler.Compile(sources, rootPath, entryOverrideName);
        }
    }
}