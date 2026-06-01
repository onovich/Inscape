namespace Inscape.Tooling {

    public sealed class HostBindingCapabilityCatalogModel {

        public string Format { get; set; } = "inscape.host-binding.capabilities";

        public int FormatVersion { get; set; } = 1;

        public string Workspace { get; set; } = string.Empty;

        public HostBindingCapabilitySourceModel HostBridge { get; set; } = new HostBindingCapabilitySourceModel();

        public List<HostBindingSpeakerCapabilityModel> Speakers { get; set; } = new List<HostBindingSpeakerCapabilityModel>();

        public List<HostBindingResourceCapabilityModel> Bindings { get; set; } = new List<HostBindingResourceCapabilityModel>();

    }

    public sealed class HostBindingCapabilitySourceModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

    }

    public sealed class HostBindingSpeakerCapabilityModel {

        public string Name { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public string RoleId { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public string SourceLabel { get; set; } = string.Empty;

        public string SourceKind { get; set; } = string.Empty;

        public int SourceRank { get; set; }

        public int Line { get; set; }

        public int Character { get; set; }

        public int Length { get; set; }

    }

    public sealed class HostBindingResourceCapabilityModel {

        public string Kind { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string AssetId { get; set; } = string.Empty;

        public string UnityGuid { get; set; } = string.Empty;

        public string AddressableKey { get; set; } = string.Empty;

        public string AssetPath { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public string SourceLabel { get; set; } = string.Empty;

        public string SourceKind { get; set; } = string.Empty;

        public int SourceRank { get; set; }

        public int Line { get; set; }

        public int Character { get; set; }

        public int Length { get; set; }

    }

}
