using Inscape.Compiler.Analysis;
using Inscape.Compiler.Parsing;

namespace Inscape.Compiler.Compilation {

    public sealed class DslScriptCompilerDomain {

        public DslScriptCompilationResultModel Compile(string source, string sourcePath) {
            DslScriptParserDomain parser = new DslScriptParserDomain();
            DslScriptCompilationResultModel result = parser.Parse(source, sourcePath);

            StoryGraphValidatorDomain validator = new StoryGraphValidatorDomain();
            validator.Validate(result.Document, result.Diagnostics);

            return result;
        }

    }

}
