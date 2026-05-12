using Inscape.Core.Analysis;
using Inscape.Core.Parsing;

namespace Inscape.Core.Compilation {

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
