using System.Text.Json.Serialization;

namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageLocalizationAnchorMapModel {

        public string Format { get; set; } = "inscape.localization-anchor-map";

        public int FormatVersion { get; set; } = 1;

        public string SourceLocale { get; set; } = "source";

        public string Csv { get; set; } = "localization/l10n.csv";

        public List<HostIntegrationPackageLocalizationAnchorEntryModel> Entries { get; set; } = new List<HostIntegrationPackageLocalizationAnchorEntryModel>();

    }

    public sealed class HostIntegrationPackageLocalizationAnchorEntryModel {

        public string Anchor { get; set; } = string.Empty;

        public string NodeTitle { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public string Speaker { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public HostIntegrationPackageSourceRefModel Source { get; set; } = new HostIntegrationPackageSourceRefModel();

        public HostIntegrationPackageLocalizationGraphRefModel GraphRef { get; set; } = new HostIntegrationPackageLocalizationGraphRefModel();

        public HostIntegrationPackageLocalizationLineIdentityModel LineIdentity { get; set; } = new HostIntegrationPackageLocalizationLineIdentityModel();

        public List<object> PartnerRefs { get; set; } = new List<object>();

    }

    public sealed class HostIntegrationPackageSourceRefModel {

        public string Path { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public string CoordinateSystem { get; set; } = "compiler-1-based";

    }

    public sealed class HostIntegrationPackageLocalizationGraphRefModel {

        public string Artifact { get; set; } = "graph/project-ir.json";

        public string NodeName { get; set; } = string.Empty;

        public string LineAnchor { get; set; } = string.Empty;

    }

    public sealed class HostIntegrationPackageLocalizationLineIdentityModel {

        public string Status { get; set; } = "missing";

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? LineId { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Fingerprint { get; set; }

    }

}
