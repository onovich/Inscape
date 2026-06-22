namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageReadResultModel {

        public string PackageDirectoryPath { get; set; } = string.Empty;

        public HostIntegrationPackageManifestModel Manifest { get; set; } = new HostIntegrationPackageManifestModel();

        public List<HostIntegrationPackageArtifactReadModel> Artifacts { get; set; } = new List<HostIntegrationPackageArtifactReadModel>();

    }

    public sealed class HostIntegrationPackageArtifactReadModel {

        public HostIntegrationPackageArtifactModel Artifact { get; set; } = new HostIntegrationPackageArtifactModel();

        public string Status { get; set; } = string.Empty;

        public string? Message { get; set; }

    }

}
