namespace Inscape.LanguageServer {

    public sealed class EditorLocationModel {

        public string SourcePath { get; set; }

        public int Line { get; set; }

        public int Character { get; set; }

        public int Length { get; set; }

        public EditorLocationModel() {
            SourcePath = string.Empty;
        }

    }

}
