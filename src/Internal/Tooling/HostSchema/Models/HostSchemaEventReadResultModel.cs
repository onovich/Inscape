namespace Inscape.Tooling {

    public sealed class HostSchemaEventReadResultModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

        public List<HostSchemaEventCapabilityModel> Events { get; set; } = new List<HostSchemaEventCapabilityModel>();

    }

}
