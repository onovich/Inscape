using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class StoryNodeMapUpdateResultModel {

        public StoryNodeMapModel NodeMap { get; set; } = new StoryNodeMapModel();

        public StoryNodeMapUpdateReportModel Report { get; set; } = new StoryNodeMapUpdateReportModel();

    }

    public sealed class StoryNodeMapUpdateReportModel {

        public string Format { get; set; } = "inscape.node-map-update-report";

        public int FormatVersion { get; set; } = 1;

        public string Workspace { get; set; } = string.Empty;

        public StoryNodeMapUpdateSummaryModel Summary { get; set; } = new StoryNodeMapUpdateSummaryModel();

        public List<StoryNodeMapUpdateReportItemModel> Items { get; set; } = new List<StoryNodeMapUpdateReportItemModel>();

    }

    public sealed class StoryNodeMapUpdateSummaryModel {

        public int TotalNodeCount { get; set; }

        public int NewNodeCount { get; set; }

        public int RenamedNodeCount { get; set; }

        public int MissingNodeCount { get; set; }

        public int ConflictNodeCount { get; set; }

        public int ManualReviewCount { get; set; }

    }

    public sealed class StoryNodeMapUpdateReportItemModel {

        public string Kind { get; set; } = string.Empty;

        public string StableId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string PreviousTitle { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int SourceLine { get; set; }

        public string Status { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public List<StoryNodeMapReviewCandidateModel> Candidates { get; set; } = new List<StoryNodeMapReviewCandidateModel>();

    }

    public sealed class StoryNodeMapReviewCandidateModel {

        public string StableId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int SourceLine { get; set; }

        public int Score { get; set; }

        public List<StoryNodeMapReviewCandidateEvidenceModel> Evidence { get; set; } = new List<StoryNodeMapReviewCandidateEvidenceModel>();

        public StoryNodeMapCandidateApplyPreviewModel ApplyPreview { get; set; } = new StoryNodeMapCandidateApplyPreviewModel();

    }

    public sealed class StoryNodeMapReviewCandidateEvidenceModel {

        public string Kind { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        public string Value { get; set; } = string.Empty;

    }

}
