namespace Inscape.Core.Model {

    public sealed class SourceSpan {

        public static readonly SourceSpan Empty = new SourceSpan(string.Empty, 0, 0);

        public string SourcePath { get; set; }

        public int Line { get; set; }

        public int Column { get; set; }

        public SourceSpan(string sourcePath, int line, int column) {
            SourcePath = sourcePath;
            Line = line;
            Column = column;
        }

    }

}
