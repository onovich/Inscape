namespace Inscape.LanguageServer {

    public sealed class LanguageServerHoverModel {

        public string Label { get; set; }

        public string Kind { get; set; }

        public string Markdown { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerHoverModel() {
            Label = string.Empty;
            Kind = string.Empty;
            Markdown = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
