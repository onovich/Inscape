namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageExportRequestModel {

        public string WorkspaceRootPath { get; set; } = string.Empty;

        public string OutputDirectoryPath { get; set; } = string.Empty;

    }

    public sealed class HostIntegrationPackageExportResultModel {

        public string OutputDirectoryPath { get; set; } = string.Empty;

        public string ManifestPath { get; set; } = string.Empty;

        public HostIntegrationPackageManifestModel Manifest { get; set; } = new HostIntegrationPackageManifestModel();

        public List<string> WrittenArtifacts { get; set; } = new List<string>();

    }

}
