namespace Inscape.Tooling {

    public sealed class HostIntegrationAuditModel {

        public string Format { get; set; } = "inscape.host-integration.audit";

        public int FormatVersion { get; set; } = 1;

        public HostIntegrationAuditWorkspaceModel Workspace { get; set; } = new HostIntegrationAuditWorkspaceModel();

        public HostIntegrationAuditInputModel Inputs { get; set; } = new HostIntegrationAuditInputModel();

        public HostIntegrationAuditSummaryModel Summary { get; set; } = new HostIntegrationAuditSummaryModel();

        public List<HostIntegrationAuditDiagnosticModel> Diagnostics { get; set; } = new List<HostIntegrationAuditDiagnosticModel>();

    }

    public sealed class HostIntegrationAuditWorkspaceModel {

        public string Root { get; set; } = string.Empty;

        public string ConfigPath { get; set; } = string.Empty;

    }

    public sealed class HostIntegrationAuditInputModel {

        public string UsageFormat { get; set; } = string.Empty;

        public int UsageFormatVersion { get; set; }

        public HostIntegrationAuditInputSourceModel HostSchema { get; set; } = new HostIntegrationAuditInputSourceModel();

        public HostIntegrationAuditInputSourceModel HostBridge { get; set; } = new HostIntegrationAuditInputSourceModel();

    }

    public sealed class HostIntegrationAuditInputSourceModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

        public string? ErrorMessage { get; set; }

    }

    public sealed class HostIntegrationAuditSummaryModel {

        public int QueryUsageCount { get; set; }

        public int ActionUsageCount { get; set; }

        public int RequiredIdCount { get; set; }

        public int DiagnosticCount { get; set; }

        public int ErrorCount { get; set; }

        public int WarningCount { get; set; }

        public int InfoCount { get; set; }

    }

    public sealed class HostIntegrationAuditDiagnosticModel {

        public string Severity { get; set; } = string.Empty;

        public string Code { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string SubjectKind { get; set; } = string.Empty;

        public string SubjectName { get; set; } = string.Empty;

        public UsageManifestSourceLocationModel Source { get; set; } = new UsageManifestSourceLocationModel();

    }

}
