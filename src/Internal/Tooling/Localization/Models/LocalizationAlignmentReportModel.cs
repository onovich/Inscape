using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class LocalizationAlignmentReportModel {

        public string Format { get; set; } = "inscape.localization-alignment";

        public int FormatVersion { get; set; } = 1;

        public string Workspace { get; set; } = string.Empty;

        public LocalizationAlignmentSummaryModel Summary { get; set; } = new LocalizationAlignmentSummaryModel();

        public List<LocalizationAlignmentItemModel> Items { get; set; } = new List<LocalizationAlignmentItemModel>();

        public LocalizationReviewPresenterModel Presenter { get; set; } = new LocalizationReviewPresenterModel();

    }

    public sealed class LocalizationAlignmentSummaryModel {

        public int KeptCount { get; set; }

        public int NewCount { get; set; }

        public int ChangedCount { get; set; }

        public int RemovedCount { get; set; }

        public int ConflictCount { get; set; }

        public int StaleCount { get; set; }

    }

    public sealed class LocalizationAlignmentItemModel {

        public string Status { get; set; } = string.Empty;

        public string Review { get; set; } = string.Empty;

        public string Anchor { get; set; } = string.Empty;

        public string NodeId { get; set; } = string.Empty;

        public string NodeTitle { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public string Speaker { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public string Translation { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public List<LocalizationAlignmentCandidateModel> Candidates { get; set; } = new List<LocalizationAlignmentCandidateModel>();

    }

    public sealed class LocalizationAlignmentCandidateModel {

        public string Reason { get; set; } = string.Empty;

        public string Anchor { get; set; } = string.Empty;

        public string NodeId { get; set; } = string.Empty;

        public string NodeTitle { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public string Speaker { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public string Translation { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public double Similarity { get; set; }

    }

}
