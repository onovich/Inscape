using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class StoryNodeMapReviewCandidateApplyResultModel {

        public string Format { get; set; } = "inscape.node-map-candidate-apply-result";

        public int FormatVersion { get; set; } = 1;

        public StoryNodeMapModel NodeMap { get; set; } = new StoryNodeMapModel();

        public bool DryRun { get; set; }

        public bool WritesNodeMap { get; set; }

        public string NodeMapPath { get; set; } = string.Empty;

        public string OutputPath { get; set; } = string.Empty;

        public string AppliedStableId { get; set; } = string.Empty;

        public string RemovedStableId { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;

        public StoryNodeMapCandidateApplyPreviewModel ChangePreview { get; set; } = new StoryNodeMapCandidateApplyPreviewModel();

        public StoryNodeMapReviewBackupMetadataModel Backup { get; set; } = new StoryNodeMapReviewBackupMetadataModel();

        public string RecoveryHint { get; set; } = string.Empty;

    }

    public sealed class StoryNodeMapReviewCandidateApplyRequestModel {

        public bool DryRun { get; set; }

        public string NodeMapPath { get; set; } = string.Empty;

        public string OutputPath { get; set; } = string.Empty;

    }

    public sealed class StoryNodeMapCandidateApplyPreviewModel {

        public string Operation { get; set; } = "reuse-candidate-stable-id";

        public string CurrentStableId { get; set; } = string.Empty;

        public string CurrentTitle { get; set; } = string.Empty;

        public string CandidateStableId { get; set; } = string.Empty;

        public string CandidateTitle { get; set; } = string.Empty;

        public string AppliedStableId { get; set; } = string.Empty;

        public string RemovedStableId { get; set; } = string.Empty;

        public string ResultTitle { get; set; } = string.Empty;

        public bool RemovesCandidateEntry { get; set; }

        public List<string> PreviousTitlesAfterApply { get; set; } = new List<string>();

    }

    public sealed class StoryNodeMapReviewBackupMetadataModel {

        public bool Required { get; set; }

        public string TargetKind { get; set; } = "node-map-sidecar";

        public string SourcePath { get; set; } = string.Empty;

        public string SuggestedBackupDirectory { get; set; } = ".inscape-workspace/backups";

        public string Status { get; set; } = string.Empty;

    }

}
