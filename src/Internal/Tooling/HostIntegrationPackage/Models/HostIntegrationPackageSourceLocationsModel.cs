using System.Text.Json.Serialization;

namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageSourceLocationsModel {

        public string Format { get; set; } = "inscape.source-locations";

        public int FormatVersion { get; set; } = 1;

        public string CoordinateSystem { get; set; } = "compiler-1-based";

        public List<HostIntegrationPackageSourceLocationSourceModel> Sources { get; set; } = new List<HostIntegrationPackageSourceLocationSourceModel>();

        public List<HostIntegrationPackageSourceLocationModel> Locations { get; set; } = new List<HostIntegrationPackageSourceLocationModel>();

    }

    public sealed class HostIntegrationPackageSourceLocationSourceModel {

        public string Id { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public string WorkspacePath { get; set; } = string.Empty;

        public string Availability { get; set; } = "packaged";

    }

    public sealed class HostIntegrationPackageSourceLocationModel {

        public string Id { get; set; } = string.Empty;

        public string SourceId { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; } = 1;

        public string Role { get; set; } = string.Empty;

        public HostIntegrationPackageSourceLocationArtifactModel Artifact { get; set; } = new HostIntegrationPackageSourceLocationArtifactModel();

    }

    public sealed class HostIntegrationPackageSourceLocationArtifactModel {

        public string Kind { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? RowKey { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ObjectPath { get; set; }

    }

}
