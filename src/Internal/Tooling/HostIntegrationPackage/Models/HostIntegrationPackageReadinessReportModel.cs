namespace Inscape.Tooling {

    public sealed class HostIntegrationPackageReadinessReportModel {

        public string Format { get; set; } = "inscape.host-integration.readiness-report";

        public int FormatVersion { get; set; } = 1;

        public string CreatedAtUtc { get; set; } = string.Empty;

        public HostIntegrationPackageReadinessProfileModel Profile { get; set; } = new HostIntegrationPackageReadinessProfileModel();

        public HostIntegrationPackageReadinessPackageModel Package { get; set; } = new HostIntegrationPackageReadinessPackageModel();

        public HostIntegrationPackageReadinessSummaryModel Summary { get; set; } = new HostIntegrationPackageReadinessSummaryModel();

        public List<HostIntegrationPackageReadinessArtifactCheckModel> ArtifactChecks { get; set; } = new List<HostIntegrationPackageReadinessArtifactCheckModel>();

        public List<HostIntegrationPackageReadinessDiagnosticModel> Diagnostics { get; set; } = new List<HostIntegrationPackageReadinessDiagnosticModel>();

        public HostIntegrationPackageReadinessHostBridgeCandidateModel HostBridgeCandidate { get; set; } = new HostIntegrationPackageReadinessHostBridgeCandidateModel();

        public HostIntegrationPackageCapabilitiesModel Boundary { get; set; } = new HostIntegrationPackageCapabilitiesModel();

    }

    public sealed class HostIntegrationPackageReadinessProfileModel {

        public string Kind { get; set; } = "partner-profile";

        public string Partner { get; set; } = "generic";

        public string Purpose { get; set; } = "static-artifact-poc";

    }

    public sealed class HostIntegrationPackageReadinessPackageModel {

        public string Manifest { get; set; } = "manifest.json";

        public string FixtureSet { get; set; } = "host-integration-package-cli";

    }

    public sealed class HostIntegrationPackageReadinessSummaryModel {

        public string Result { get; set; } = "ready";

        public int ArtifactCount { get; set; }

        public int ReadyCount { get; set; }

        public int MissingCount { get; set; }

        public int InvalidCount { get; set; }

        public int IncompatibleCount { get; set; }

        public int UnsupportedCount { get; set; }

        public int BlockedCount { get; set; }

        public bool WritesHostData { get; set; }

    }

    public sealed class HostIntegrationPackageReadinessArtifactCheckModel {

        public string Kind { get; set; } = string.Empty;

        public string Path { get; set; } = string.Empty;

        public bool Required { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Format { get; set; }

        public int? FormatVersion { get; set; }

    }

    public sealed class HostIntegrationPackageReadinessDiagnosticModel {

        public string Code { get; set; } = string.Empty;

        public string Severity { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public HostIntegrationPackageSourceRefModel Source { get; set; } = new HostIntegrationPackageSourceRefModel();

    }

    public sealed class HostIntegrationPackageReadinessHostBridgeCandidateModel {

        public string Path { get; set; } = "host/host-bridge-candidate.json";

        public string Status { get; set; } = "missing";

        public int CandidateCount { get; set; }

        public bool WritesHostData { get; set; }

    }

}
