namespace Inscape.Compiler.Model {

    public sealed class SourceSpanModel {

        public static readonly SourceSpanModel Empty = new SourceSpanModel(string.Empty, 0, 0);

        public string SourcePath { get; set; }

        public int Line { get; set; }

        public int Column { get; set; }

        public SourceSpanModel(string sourcePath, int line, int column) {
            SourcePath = sourcePath;
            Line = line;
            Column = column;
        }

    }

}
