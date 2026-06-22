using System.Text.Json.Serialization;

namespace Inscape.Tooling {

    public sealed class HostBridgeCandidateModel {

        public string Format { get; set; } = "inscape.host-bridge-candidate";

        public int FormatVersion { get; set; } = 1;

        public string CreatedAtUtc { get; set; } = string.Empty;

        public HostBridgeCandidateProfileModel Profile { get; set; } = new HostBridgeCandidateProfileModel();

        public HostBridgeCandidateSourceArtifactsModel SourceArtifacts { get; set; } = new HostBridgeCandidateSourceArtifactsModel();

        public HostBridgeCandidateSummaryModel Summary { get; set; } = new HostBridgeCandidateSummaryModel();

        public List<HostBridgeCandidateItemModel> Candidates { get; set; } = new List<HostBridgeCandidateItemModel>();

        public List<HostBridgeCandidateDiagnosticModel> Diagnostics { get; set; } = new List<HostBridgeCandidateDiagnosticModel>();

    }

    public sealed class HostBridgeCandidateProfileModel {

        public string Kind { get; set; } = "generic";

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Partner { get; set; }

        public string Purpose { get; set; } = "static-artifact-poc";

    }

    public sealed class HostBridgeCandidateSourceArtifactsModel {

        public string Usage { get; set; } = "usage/usage.json";

        public string HostSchema { get; set; } = "host/host-schema-capabilities.json";

        public string HostIntegrationAudit { get; set; } = "host/host-integration-audit.json";

        public string HostBridge { get; set; } = "host/inscape.host.bridge.json";

    }

    public sealed class HostBridgeCandidateSummaryModel {

        public string Result { get; set; } = "empty";

        public int CandidateCount { get; set; }

        public int ConflictCount { get; set; }

        public int BlockedCount { get; set; }

        public bool WritesHostData { get; set; }

    }

    public sealed class HostBridgeCandidateItemModel {

        public string Id { get; set; } = string.Empty;

        public string CandidateKind { get; set; } = string.Empty;

        public string Status { get; set; } = "candidate";

        public HostBridgeCandidateSubjectModel Subject { get; set; } = new HostBridgeCandidateSubjectModel();

        public HostBridgeCandidateDemandModel Demand { get; set; } = new HostBridgeCandidateDemandModel();

        public HostBridgeCandidateProposedMappingModel ProposedMapping { get; set; } = new HostBridgeCandidateProposedMappingModel();

        public HostBridgeCandidateConfidenceModel Confidence { get; set; } = new HostBridgeCandidateConfidenceModel();

        public HostBridgeCandidateReviewModel Review { get; set; } = new HostBridgeCandidateReviewModel();

        public HostBridgeCandidateOwnershipModel Ownership { get; set; } = new HostBridgeCandidateOwnershipModel();

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? DiagnosticCode { get; set; }

    }

    public sealed class HostBridgeCandidateSubjectModel {

        public string Kind { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

    }

    public sealed class HostBridgeCandidateDemandModel {

        public string Artifact { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public string Reason { get; set; } = string.Empty;

        public HostBridgeCandidateSourceRefModel Source { get; set; } = new HostBridgeCandidateSourceRefModel();

    }

    public sealed class HostBridgeCandidateSourceRefModel {

        public string Path { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

        public string CoordinateSystem { get; set; } = "compiler-1-based";

    }

    public sealed class HostBridgeCandidateProposedMappingModel {

        public string BridgeTarget { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? SuggestedName { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Notes { get; set; }

    }

    public sealed class HostBridgeCandidateConfidenceModel {

        public string Level { get; set; } = "low";

        public decimal Score { get; set; }

        public List<string> Reasons { get; set; } = new List<string>();

    }

    public sealed class HostBridgeCandidateReviewModel {

        public bool Required { get; set; } = true;

        public string Decision { get; set; } = "unreviewed";

        public string Owner { get; set; } = "partner";

    }

    public sealed class HostBridgeCandidateOwnershipModel {

        public string Producer { get; set; } = "inscape-tooling";

        public string GeneratedOwnership { get; set; } = "candidate-only";

        public bool WritesHostData { get; set; }

    }

    public sealed class HostBridgeCandidateDiagnosticModel {

        public string Severity { get; set; } = "error";

        public string Code { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

    }

}
