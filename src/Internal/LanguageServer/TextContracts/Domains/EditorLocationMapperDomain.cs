using Inscape.Compiler.Model;

namespace Inscape.LanguageServer {

    public static class EditorLocationMapperDomain {

        public static EditorLocationModel FromCompilerSource(SourceSpanModel source, int length = 1) {
            return new EditorLocationModel {
                SourcePath = source.SourcePath,
                Line = ToEditorCoordinate(source.Line),
                Character = ToEditorCoordinate(source.Column),
                Length = length < 0 ? 0 : length
            };
        }

        public static int ToEditorCoordinate(int compilerCoordinate) {
            return compilerCoordinate <= 1 ? 0 : compilerCoordinate - 1;
        }

    }

}
