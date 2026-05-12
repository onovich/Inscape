namespace Inscape.Core.Diagnostics {

    public sealed class Diagnostic {

        public string Code { get; set; }

        public DiagnosticSeverity Severity { get; set; }

        public string Message { get; set; }

        public string SourcePath { get; set; }

        public int Line { get; set; }

        public int Column { get; set; }

        public Diagnostic(string code,
                          DiagnosticSeverity severity,
                          string message,
                          string sourcePath,
                          int line,
                          int column) {
            Code = code;
            Severity = severity;
            Message = message;
            SourcePath = sourcePath;
            Line = line;
            Column = column;
        }

    }

}
