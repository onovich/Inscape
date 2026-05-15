namespace Inscape.LanguageServer {

    public sealed class LanguageServerCompletionModel {

        public string Label { get; set; }

        public string Kind { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerCompletionModel() {
            Label = string.Empty;
            Kind = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
