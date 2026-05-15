namespace Inscape.LanguageServer {

    public sealed class LanguageServerDefinitionModel {

        public string Name { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerDefinitionModel() {
            Name = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
