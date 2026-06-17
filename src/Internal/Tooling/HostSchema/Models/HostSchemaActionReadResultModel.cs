namespace Inscape.Tooling {

    public sealed class HostSchemaActionReadResultModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

        public List<HostSchemaActionCapabilityModel> Actions { get; set; } = new List<HostSchemaActionCapabilityModel>();

    }

}
