namespace Inscape.Tooling {

    public sealed class HostSchemaQueryReadResultModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

        public List<HostSchemaQueryCapabilityModel> Queries { get; set; } = new List<HostSchemaQueryCapabilityModel>();

    }

}
