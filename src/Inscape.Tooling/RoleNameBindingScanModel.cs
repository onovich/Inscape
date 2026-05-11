namespace Inscape.Tooling {

    public sealed class RoleNameBindingScanResultModel {

        public Dictionary<string, int> RoleIdsBySpeaker { get; set; } = new Dictionary<string, int>(StringComparer.Ordinal);

        public Dictionary<string, List<RoleNameBindingCandidateModel>> CandidatesBySpeaker { get; set; } = new Dictionary<string, List<RoleNameBindingCandidateModel>>(StringComparer.Ordinal);

        public bool ScannedRoleNameCsv { get; set; }

    }

    public sealed class RoleNameBindingCandidateModel {

        public int RoleId { get; set; }

        public string Description { get; set; } = string.Empty;

        public string Language { get; set; } = string.Empty;

    }

}