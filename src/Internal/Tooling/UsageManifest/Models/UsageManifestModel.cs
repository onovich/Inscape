using System.Text.Json.Serialization;

namespace Inscape.Tooling {

    public sealed class UsageManifestModel {

        public string Format { get; set; } = "inscape.usage";

        public int FormatVersion { get; set; } = 1;

        public UsageManifestWorkspaceModel Workspace { get; set; } = new UsageManifestWorkspaceModel();

        public UsageManifestSummaryModel Summary { get; set; } = new UsageManifestSummaryModel();

        public List<UsageManifestQueryUsageModel> Queries { get; set; } = new List<UsageManifestQueryUsageModel>();

        public List<UsageManifestActionUsageModel> Actions { get; set; } = new List<UsageManifestActionUsageModel>();

        public List<UsageManifestRequiredIdModel> RequiredIds { get; set; } = new List<UsageManifestRequiredIdModel>();

    }

    public sealed class UsageManifestWorkspaceModel {

        public string Root { get; set; } = string.Empty;

        public string ConfigPath { get; set; } = string.Empty;

    }

    public sealed class UsageManifestSummaryModel {

        public int SourceCount { get; set; }

        public int QueryCount { get; set; }

        public int ActionCount { get; set; }

        public int RequiredIdCount { get; set; }

        public int NonLiteralArgumentCount { get; set; }

    }

    public sealed class UsageManifestQueryUsageModel {

        public string Name { get; set; } = string.Empty;

        public string Syntax { get; set; } = string.Empty;

        public string Context { get; set; } = string.Empty;

        public string Raw { get; set; } = string.Empty;

        public List<UsageManifestLiteralArgumentModel> Arguments { get; set; } = new List<UsageManifestLiteralArgumentModel>();

        public UsageManifestSourceLocationModel Source { get; set; } = new UsageManifestSourceLocationModel();

    }

    public sealed class UsageManifestActionUsageModel {

        public string Name { get; set; } = string.Empty;

        public string UsageKind { get; set; } = string.Empty;

        public string Context { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Phase { get; set; }

        public string Raw { get; set; } = string.Empty;

        public List<UsageManifestLiteralArgumentModel> Arguments { get; set; } = new List<UsageManifestLiteralArgumentModel>();

        public UsageManifestSourceLocationModel Source { get; set; } = new UsageManifestSourceLocationModel();

    }

    public sealed class UsageManifestLiteralArgumentModel {

        public int Index { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? Name { get; set; }

        public string Raw { get; set; } = string.Empty;

        public string LiteralKind { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public object? Value { get; set; }

        [JsonIgnore]
        public UsageManifestSourceLocationModel Source { get; set; } = new UsageManifestSourceLocationModel();

    }

    public sealed class UsageManifestRequiredIdModel {

        public string Kind { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public UsageManifestRequiredIdUsageModel UsedBy { get; set; } = new UsageManifestRequiredIdUsageModel();

        public string Reason { get; set; } = string.Empty;

        public UsageManifestSourceLocationModel Source { get; set; } = new UsageManifestSourceLocationModel();

    }

    public sealed class UsageManifestRequiredIdUsageModel {

        public string CapabilityKind { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public int ArgumentIndex { get; set; }

    }

    public sealed class UsageManifestSourceLocationModel {

        public string Path { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

    }

}
