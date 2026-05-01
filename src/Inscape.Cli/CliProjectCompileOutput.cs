using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Cli {

    public sealed class CliProjectCompileOutput {

        public string Format { get; set; } = string.Empty;

        public int FormatVersion { get; set; }

        public string RootPath { get; set; } = string.Empty;

        public List<InscapeDocument> Documents { get; set; } = new List<InscapeDocument>();

        public InscapeDocument Graph { get; set; } = new InscapeDocument();

        public string EntryNodeName { get; set; } = string.Empty;

        public List<Diagnostic> Diagnostics { get; set; } = new List<Diagnostic>();

        public bool HasErrors { get; set; }

    }

}
