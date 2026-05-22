using System.Globalization;

namespace Inscape.Tooling {

    public static class LocalizationReviewPresenterModelBuilderDomain {

        public static LocalizationReviewPresenterModel Build(LocalizationAlignmentReportModel report,
                                                             Func<string, string>? formatDisplayPath = null) {
            Func<string, string> displayFormatter = formatDisplayPath ?? Path.GetFileName;
            LocalizationReviewPresenterModel presenter = new LocalizationReviewPresenterModel();
            for (int i = 0; i < report.Items.Count; i += 1) {
                presenter.Items.Add(BuildItem(report.Items[i], displayFormatter));
            }

            return presenter;
        }

        public static LocalizationReviewItemPresenterModel BuildItem(LocalizationAlignmentItemModel item,
                                                                     Func<string, string>? formatDisplayPath = null) {
            Func<string, string> displayFormatter = formatDisplayPath ?? Path.GetFileName;
            int sourceLine = item.Line > 0 ? item.Line : 1;
            int sourceColumn = item.Column > 0 ? item.Column : 1;
            LocalizationReviewItemPresenterModel model = new LocalizationReviewItemPresenterModel {
                Title = BuildItemTitle(item),
                Summary = string.IsNullOrWhiteSpace(item.Translation) ? "translation: (empty)" : "translation: " + item.Translation,
                Detail = BuildSourceSummary(item.SourcePath, sourceLine, sourceColumn, displayFormatter) + BuildLineIdentitySummary(item.LineId, item.LineIdentityStatus, item.LineFingerprint) + " | " + item.Text + " | " + BuildCandidateSummary(item.Candidates),
                SourcePath = item.SourcePath,
                Line = sourceLine,
                Column = sourceColumn,
                Length = item.Text.Length,
                Item = item,
            };

            model.Actions.Add(new LocalizationReviewActionPresenterModel {
                ActionKey = "open-current",
                Summary = BuildSourceSummary(item.SourcePath, sourceLine, sourceColumn, displayFormatter) + BuildLineIdentitySummary(item.LineId, item.LineIdentityStatus, item.LineFingerprint),
                Detail = item.Text,
                SourcePath = item.SourcePath,
                Line = sourceLine,
                Column = sourceColumn,
                Length = item.Text.Length,
            });

            for (int i = 0; i < item.Candidates.Count; i += 1) {
                LocalizationAlignmentCandidateModel candidate = item.Candidates[i];
                int candidateLine = candidate.Line > 0 ? candidate.Line : 1;
                int candidateColumn = candidate.Column > 0 ? candidate.Column : 1;
                model.Actions.Add(new LocalizationReviewActionPresenterModel {
                    ActionKey = "open-candidate",
                    ActionIndex = i,
                    ActionStatus = BuildCandidateStatus(candidate),
                    Summary = string.IsNullOrWhiteSpace(candidate.Translation) ? "(no translation)" : candidate.Translation,
                    Detail = BuildSourceSummary(candidate.SourcePath, candidateLine, candidateColumn, displayFormatter) + BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint) + " | " + BuildCandidateInline(candidate),
                    SourcePath = candidate.SourcePath,
                    Line = candidateLine,
                    Column = candidateColumn,
                    Length = candidate.Text.Length,
                });
                model.Actions.Add(new LocalizationReviewActionPresenterModel {
                    ActionKey = "show-candidate-diff",
                    ActionIndex = i,
                    ActionStatus = BuildCandidateStatus(candidate),
                    Summary = BuildCandidateDiffSummary(item, candidate),
                    Detail = BuildCandidateDiffDetail(item, candidate),
                });
            }

            return model;
        }

        static string BuildItemTitle(LocalizationAlignmentItemModel item) {
            int candidateCount = item.Candidates.Count;
            return "[" + item.Status + "] " + item.NodeTitle + " - " + item.Review + (candidateCount > 0 ? " (" + candidateCount.ToString(CultureInfo.InvariantCulture) + " candidates)" : string.Empty);
        }

        static string BuildCandidateSummary(List<LocalizationAlignmentCandidateModel> candidates) {
            if (candidates.Count == 0) {
                return "No candidates";
            }

            List<string> values = new List<string>();
            for (int i = 0; i < candidates.Count && i < 2; i += 1) {
                values.Add(BuildCandidateInline(candidates[i]));
            }

            return string.Join(" | ", values);
        }

        static string BuildCandidateInline(LocalizationAlignmentCandidateModel candidate) {
            string similarity = candidate.Similarity > 0
                ? " @" + candidate.Similarity.ToString("0.000", CultureInfo.InvariantCulture)
                : string.Empty;
            string reason = string.IsNullOrWhiteSpace(candidate.Reason)
                ? string.Empty
                : " {" + candidate.Reason + "}";
            string translation = string.IsNullOrWhiteSpace(candidate.Translation)
                ? string.Empty
                : " => " + candidate.Translation;
            return candidate.Text + translation + similarity + BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint) + " [" + BuildRankPenaltySummary(candidate) + "]" + reason;
        }

        static string BuildCandidateStatus(LocalizationAlignmentCandidateModel candidate) {
            string similarity = candidate.Similarity > 0
                ? "similarity " + candidate.Similarity.ToString("0.000", CultureInfo.InvariantCulture)
                : "candidate";
            string rankedSimilarity = similarity + " / " + BuildRankPenaltySummary(candidate);
            return string.IsNullOrWhiteSpace(candidate.Reason)
                ? rankedSimilarity
                : rankedSimilarity + " / " + candidate.Reason;
        }

        static string BuildRankPenaltySummary(LocalizationAlignmentCandidateModel candidate) {
            return "rankPenalty " + candidate.RankPenalty.ToString(CultureInfo.InvariantCulture);
        }

        static string BuildLineIdentitySummary(string lineId, string status, string fingerprint) {
            string fingerprintSummary = BuildLineFingerprintSummary(fingerprint);
            if (!string.IsNullOrWhiteSpace(lineId)) {
                return string.IsNullOrWhiteSpace(status)
                    ? " <line " + lineId + fingerprintSummary + ">"
                    : " <line " + lineId + " " + status + fingerprintSummary + ">";
            }

            if (!string.IsNullOrWhiteSpace(status)) {
                return " <lineIdentity " + status + fingerprintSummary + ">";
            }

            return string.IsNullOrWhiteSpace(fingerprintSummary) ? string.Empty : " <lineIdentity" + fingerprintSummary + ">";
        }

        static string BuildLineFingerprintSummary(string fingerprint) {
            if (string.IsNullOrWhiteSpace(fingerprint)) {
                return string.Empty;
            }

            string trimmed = fingerprint.Trim();
            return " fp " + trimmed.Substring(0, Math.Min(trimmed.Length, 12));
        }

        static string BuildCandidateDiffSummary(LocalizationAlignmentItemModel item, LocalizationAlignmentCandidateModel candidate) {
            return "current: " + item.Text + " -> previous: " + candidate.Text;
        }

        static string BuildCandidateDiffDetail(LocalizationAlignmentItemModel item, LocalizationAlignmentCandidateModel candidate) {
            string translation = string.IsNullOrWhiteSpace(candidate.Translation)
                ? "translation: (empty)"
                : "translation: " + candidate.Translation;
            string reason = string.IsNullOrWhiteSpace(candidate.Reason)
                ? "reason: (none)"
                : "reason: " + candidate.Reason;
            return "current: " + item.Text
                + BuildLineIdentitySummary(item.LineId, item.LineIdentityStatus, item.LineFingerprint)
                + " | previous: " + candidate.Text
                + BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint)
                + " | " + translation
                + " | " + BuildRankPenaltySummary(candidate)
                + " | " + reason;
        }

        static string BuildSourceSummary(string sourcePath, int line, int column, Func<string, string> formatDisplayPath) {
            return formatDisplayPath(sourcePath ?? string.Empty) + ":" + line.ToString(CultureInfo.InvariantCulture) + ":" + column.ToString(CultureInfo.InvariantCulture);
        }

    }

}
