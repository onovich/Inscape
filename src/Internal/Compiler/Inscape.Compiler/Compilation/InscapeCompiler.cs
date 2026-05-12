using Inscape.Compiler.Analysis;
using Inscape.Compiler.Parsing;

namespace Inscape.Compiler.Compilation {

    public sealed class InscapeCompiler {

        public CompilationResult Compile(string source, string sourcePath) {
            InscapeParser parser = new InscapeParser();
            CompilationResult result = parser.Parse(source, sourcePath);

            GraphValidator validator = new GraphValidator();
            validator.Validate(result.Document, result.Diagnostics);

            return result;
        }

    }

}
