namespace Inscape.LanguageServer {

    public sealed class LanguageServerDiagnosticModel {

        public string Code { get; set; }

        public string Severity { get; set; }

        public string Message { get; set; }

        public EditorLocationModel Location { get; set; }

        public LanguageServerDiagnosticModel() {
            Code = string.Empty;
            Severity = string.Empty;
            Message = string.Empty;
            Location = new EditorLocationModel();
        }

    }

}
