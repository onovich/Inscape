using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class LocalizationReviewPresenterModel {

        public List<LocalizationReviewItemPresenterModel> Items { get; set; } = new List<LocalizationReviewItemPresenterModel>();

    }

    public sealed class LocalizationReviewItemPresenterModel {

        public string Title { get; set; } = string.Empty;

        public string Summary { get; set; } = string.Empty;

        public string Detail { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

        public LocalizationAlignmentItemModel Item { get; set; } = new LocalizationAlignmentItemModel();

        public List<LocalizationReviewActionPresenterModel> Actions { get; set; } = new List<LocalizationReviewActionPresenterModel>();

    }

    public sealed class LocalizationReviewActionPresenterModel {

        public string ActionKey { get; set; } = string.Empty;

        public int ActionIndex { get; set; } = -1;

        public string ActionStatus { get; set; } = string.Empty;

        public string Summary { get; set; } = string.Empty;

        public string Detail { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

    }

}
