namespace Inscape.Compiler.Diagnostics {

    public sealed class DiagnosticModel {

        public string Code { get; set; }

        public DiagnosticSeverityModel Severity { get; set; }

        public string Message { get; set; }

        public string SourcePath { get; set; }

        public int Line { get; set; }

        public int Column { get; set; }

        public DiagnosticModel(string code,
                          DiagnosticSeverityModel severity,
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
