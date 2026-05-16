namespace Inscape.Tooling {

    public sealed class QueryInterpolationAuditModel {

        public string Format { get; set; } = "inscape.query-interpolation.audit";

        public int FormatVersion { get; set; } = 1;

        public string Workspace { get; set; } = string.Empty;

        public QueryInterpolationHostSchemaModel HostSchema { get; set; } = new QueryInterpolationHostSchemaModel();

        public QueryInterpolationAuditSummaryModel Summary { get; set; } = new QueryInterpolationAuditSummaryModel();

        public List<QueryInterpolationAuditDiagnosticModel> Diagnostics { get; set; } = new List<QueryInterpolationAuditDiagnosticModel>();

    }

    public sealed class QueryInterpolationHostSchemaModel {

        public string? ConfiguredPath { get; set; }

        public string? ResolvedPath { get; set; }

        public bool Loaded { get; set; }

    }

    public sealed class QueryInterpolationAuditSummaryModel {

        public int InterpolationCount { get; set; }

        public int DiagnosticCount { get; set; }

        public int UnknownQueryCount { get; set; }

        public int ParameterizedQueryCount { get; set; }

    }

    public sealed class QueryInterpolationAuditDiagnosticModel {

        public string Code { get; set; } = string.Empty;

        public string Severity { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string Query { get; set; } = string.Empty;

        public string Raw { get; set; } = string.Empty;

        public QueryInterpolationSourceModel Source { get; set; } = new QueryInterpolationSourceModel();

    }

    public sealed class QueryInterpolationSourceModel {

        public string Path { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

    }

}
