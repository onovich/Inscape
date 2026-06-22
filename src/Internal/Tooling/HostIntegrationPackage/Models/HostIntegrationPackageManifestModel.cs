using System.Text.Json.Serialization;

namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageManifestModel {

        public string Format { get; set; } = "inscape.integration-package";

        public int FormatVersion { get; set; } = 1;

        public string CreatedAtUtc { get; set; } = string.Empty;

        public HostIntegrationPackageProducerModel Producer { get; set; } = new HostIntegrationPackageProducerModel();

        public HostIntegrationPackageWorkspaceModel Workspace { get; set; } = new HostIntegrationPackageWorkspaceModel();

        public HostIntegrationPackageProfileModel Profile { get; set; } = new HostIntegrationPackageProfileModel();

        public List<HostIntegrationPackageArtifactModel> Artifacts { get; set; } = new List<HostIntegrationPackageArtifactModel>();

        public HostIntegrationPackageCapabilitiesModel Capabilities { get; set; } = new HostIntegrationPackageCapabilitiesModel();

    }

    public sealed class HostIntegrationPackageProducerModel {

        public string Name { get; set; } = "Inscape";

        public string Tool { get; set; } = "Inscape.Cli";

        public string Version { get; set; } = "0.0.0";

    }

    public sealed class HostIntegrationPackageWorkspaceModel {

        public string Name { get; set; } = string.Empty;

        public string RootPolicy { get; set; } = "workspace-relative";

    }

    public sealed class HostIntegrationPackageProfileModel {

        public string Kind { get; set; } = "generic";

        public string? Partner { get; set; }

        public string Purpose { get; set; } = "static-artifact-poc";

    }

    public sealed class HostIntegrationPackageArtifactModel {

        public string Kind { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public bool Required { get; set; }

        public string Status { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Format { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public int? FormatVersion { get; set; }

        public string ProducerRole { get; set; } = string.Empty;

    }

    public sealed class HostIntegrationPackageCapabilitiesModel {

        public bool RuntimeIntegration { get; set; }

        public bool PreviewBridge { get; set; }

        public bool WritesHostData { get; set; }

        public bool ContainsHostDependency { get; set; }

    }

}
