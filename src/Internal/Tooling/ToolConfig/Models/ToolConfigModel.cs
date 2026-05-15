namespace Inscape.Tooling {

    public sealed class ToolConfigModel {

        public string? HostSchema { get; set; }

        public string? HostBridge { get; set; }

        public ToolConfigStyleModel Styles { get; set; } = new ToolConfigStyleModel();

        public ToolConfigUnitySampleModel UnitySample { get; set; } = new ToolConfigUnitySampleModel();

    }

    public sealed class ToolConfigStyleModel {

        public string? Editor { get; set; }

        public string? Preview { get; set; }

    }

    public sealed class ToolConfigUnitySampleModel {

        public string? RoleMap { get; set; }

        public string? BindingMap { get; set; }

        public string? ExistingRoleNameCsv { get; set; }

        public string? ExistingTimelineRoot { get; set; }

        public string? ExistingTalkingRoot { get; set; }

        public int? TalkingIdStart { get; set; }

    }

}
