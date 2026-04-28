using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Cli {

    public sealed class CompileOutput {

        public string Format { get; set; } = string.Empty;

        public int FormatVersion { get; set; }

        public InscapeDocument Document { get; set; } = new InscapeDocument();

        public List<Diagnostic> Diagnostics { get; set; } = new List<Diagnostic>();

        public bool HasErrors { get; set; }

    }

}
