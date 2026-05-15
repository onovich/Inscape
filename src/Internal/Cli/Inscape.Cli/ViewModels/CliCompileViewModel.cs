using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Cli {

    public sealed class CliCompileViewModel {

        public string Format { get; set; } = string.Empty;

        public int FormatVersion { get; set; }

        public DslScriptDocumentModel Document { get; set; } = new DslScriptDocumentModel();

        public List<DiagnosticModel> Diagnostics { get; set; } = new List<DiagnosticModel>();

        public bool HasErrors { get; set; }

    }

}
