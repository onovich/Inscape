namespace Inscape.LanguageServer {

    public sealed class LanguageServerDocumentSymbolModel {

        public string Name { get; set; }

        public string Kind { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerDocumentSymbolModel() {
            Name = string.Empty;
            Kind = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
