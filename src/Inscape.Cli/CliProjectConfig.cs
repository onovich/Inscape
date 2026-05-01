namespace Inscape.Cli {

    sealed class CliProjectConfig {

        public string? HostSchema { get; set; }

        public CliStyleProjectConfig Styles { get; set; } = new CliStyleProjectConfig();

        public CliUnitySampleProjectConfig UnitySample { get; set; } = new CliUnitySampleProjectConfig();

    }

    sealed class CliStyleProjectConfig {

        public string? Editor { get; set; }

        public string? Preview { get; set; }

    }

    sealed class CliUnitySampleProjectConfig {

        public string? RoleMap { get; set; }

        public string? BindingMap { get; set; }

        public string? ExistingRoleNameCsv { get; set; }

        public string? ExistingTimelineRoot { get; set; }

        public string? ExistingTalkingRoot { get; set; }

        public int? TalkingIdStart { get; set; }

    }

}