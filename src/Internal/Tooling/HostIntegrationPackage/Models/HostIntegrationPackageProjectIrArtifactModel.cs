using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageProjectIrArtifactModel {

        public string Format { get; set; } = "inscape.project-ir";

        public int FormatVersion { get; set; } = 1;

        public string RootPath { get; set; } = string.Empty;

        public List<DslScriptDocumentModel> Documents { get; set; } = new List<DslScriptDocumentModel>();

        public DslScriptDocumentModel Graph { get; set; } = new DslScriptDocumentModel();

        public string EntryNodeName { get; set; } = string.Empty;

        public List<DiagnosticModel> Diagnostics { get; set; } = new List<DiagnosticModel>();

        public bool HasErrors { get; set; }

    }

}
