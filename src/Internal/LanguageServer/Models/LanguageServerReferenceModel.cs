namespace Inscape.LanguageServer {

    public sealed class LanguageServerReferenceModel {

        public string Target { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerReferenceModel() {
            Target = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
