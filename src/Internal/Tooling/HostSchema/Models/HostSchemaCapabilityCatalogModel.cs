namespace Inscape.Tooling {

    public sealed class HostSchemaCapabilityCatalogModel {

        public string Format { get; set; } = "inscape.host-schema.capabilities";

        public int FormatVersion { get; set; } = 1;

        public string Workspace { get; set; } = string.Empty;

        public HostSchemaCapabilitySourceModel HostSchema { get; set; } = new HostSchemaCapabilitySourceModel();

        public List<HostSchemaQueryCapabilityModel> Queries { get; set; } = new List<HostSchemaQueryCapabilityModel>();

        public List<HostSchemaEventCapabilityModel> Events { get; set; } = new List<HostSchemaEventCapabilityModel>();

    }

    public sealed class HostSchemaCapabilitySourceModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

    }

}
