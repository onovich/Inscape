namespace Inscape.Tooling {

    public sealed class StoryNodeMapReviewCandidateApplyResultModel {

        public StoryNodeMapModel NodeMap { get; set; } = new StoryNodeMapModel();

        public string AppliedStableId { get; set; } = string.Empty;

        public string RemovedStableId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

    }

}
