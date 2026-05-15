using System.Collections.Generic;

namespace Inscape.LanguageServer {

    public sealed class LanguageServerCapabilityModel {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public string SourceLocationContract { get; set; }

        public string WorkspaceIndexContract { get; set; }

        public List<string> Capabilities { get; set; }

        public LanguageServerCapabilityModel() {
            Format = "inscape.language-server-capabilities";
            FormatVersion = 1;
            SourceLocationContract = "docs/source-location-contracts.md";
            WorkspaceIndexContract = "docs/workspace-index-contract.md";
            Capabilities = new List<string>();
        }

    }

}
