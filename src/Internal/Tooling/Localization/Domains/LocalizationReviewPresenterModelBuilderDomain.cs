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
                Signals = BuildItemSignals(item),
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
                    Signals = BuildCandidateSignals(candidate),
                });
                model.Actions.Add(new LocalizationReviewActionPresenterModel {
                    ActionKey = "show-candidate-diff",
                    ActionIndex = i,
                    ActionStatus = BuildCandidateStatus(candidate),
                    Summary = BuildCandidateDiffSummary(item, candidate),
                    Detail = BuildCandidateDiffDetail(item, candidate),
                    Signals = BuildDiffSignals(item, candidate),
                });
            }

            return model;
        }

        static string BuildItemTitle(LocalizationAlignmentItemModel item) {
            int candidateCount = item.Candidates.Count;
            return "[" + item.Status + "] " + item.NodeTitle + " - " + item.Review + BuildCandidateCountSummary(candidateCount);
        }

        static List<LocalizationReviewSignalPresenterModel> BuildItemSignals(LocalizationAlignmentItemModel item) {
            List<LocalizationReviewSignalPresenterModel> signals = new List<LocalizationReviewSignalPresenterModel> {
                CreateSignal("review-status", "Review", item.Status + "/" + item.Review, ReviewSeverity(item.Status)),
            };

            if (item.Candidates.Count > 0) {
                signals.Add(CreateSignal("candidate-count", "Candidates", item.Candidates.Count.ToString(CultureInfo.InvariantCulture), item.Status == "conflict" ? "risk" : "warning"));
            }

            AddLineIdentitySignal(signals, "current-line-identity", "Current Line", item.LineId, item.LineIdentityStatus, item.LineFingerprint, LineIdentitySeverity(item.LineIdentityStatus));
            return signals;
        }

        static List<LocalizationReviewSignalPresenterModel> BuildCandidateSignals(LocalizationAlignmentCandidateModel candidate) {
            List<LocalizationReviewSignalPresenterModel> signals = new List<LocalizationReviewSignalPresenterModel>();
            if (candidate.Similarity > 0) {
                signals.Add(CreateSignal("similarity", "Similarity", candidate.Similarity.ToString("0.000", CultureInfo.InvariantCulture), "info"));
            }

            signals.Add(CreateSignal("rank-penalty", "Rank Penalty", candidate.RankPenalty.ToString(CultureInfo.InvariantCulture), candidate.RankPenalty > 0 ? "warning" : "info"));
            if (!string.IsNullOrWhiteSpace(candidate.Reason)) {
                signals.Add(CreateSignal("reason", "Reason", candidate.Reason, "info"));
            }

            AddLineIdentitySignal(signals, "candidate-line-identity", "Candidate Line", candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint, LineIdentitySeverity(candidate.LineIdentityStatus));
            return signals;
        }

        static List<LocalizationReviewSignalPresenterModel> BuildDiffSignals(LocalizationAlignmentItemModel item, LocalizationAlignmentCandidateModel candidate) {
            List<LocalizationReviewSignalPresenterModel> signals = BuildCandidateSignals(candidate);
            AddLineIdentitySignal(signals, "current-line-identity", "Current Line", item.LineId, item.LineIdentityStatus, item.LineFingerprint, LineIdentitySeverity(item.LineIdentityStatus));
            return signals;
        }

        static string BuildCandidateCountSummary(int candidateCount) {
            if (candidateCount <= 0) {
                return string.Empty;
            }

            string label = candidateCount == 1 ? " candidate" : " candidates";
            return " (" + candidateCount.ToString(CultureInfo.InvariantCulture) + label + ")";
        }

        static string BuildCandidateSummary(List<LocalizationAlignmentCandidateModel> candidates) {
            if (candidates.Count == 0) {
                return "No candidates";
            }

            List<string> values = new List<string>();
            for (int i = 0; i < candidates.Count && i < 2; i += 1) {
                values.Add(BuildCandidateInline(candidates[i]));
            }

            if (candidates.Count > 2) {
                values.Add("+" + (candidates.Count - 2).ToString(CultureInfo.InvariantCulture) + " more");
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
            string reasonedStatus = string.IsNullOrWhiteSpace(candidate.Reason)
                ? rankedSimilarity
                : rankedSimilarity + " / " + candidate.Reason;
            return reasonedStatus + BuildCandidateLineStatus(candidate);
        }

        static string BuildRankPenaltySummary(LocalizationAlignmentCandidateModel candidate) {
            return "rankPenalty " + candidate.RankPenalty.ToString(CultureInfo.InvariantCulture);
        }

        static string BuildCandidateLineStatus(LocalizationAlignmentCandidateModel candidate) {
            if (string.IsNullOrWhiteSpace(candidate.LineId)) {
                return string.Empty;
            }

            string status = string.IsNullOrWhiteSpace(candidate.LineIdentityStatus) ? string.Empty : " " + candidate.LineIdentityStatus;
            return " / line " + candidate.LineId + status + BuildLineFingerprintSummary(candidate.LineFingerprint);
        }

        static void AddLineIdentitySignal(List<LocalizationReviewSignalPresenterModel> signals,
                                          string key,
                                          string label,
                                          string lineId,
                                          string status,
                                          string fingerprint,
                                          string severity) {
            string value = BuildLineIdentitySignalValue(lineId, status, fingerprint);
            if (!string.IsNullOrWhiteSpace(value)) {
                signals.Add(CreateSignal(key, label, value, severity));
            }
        }

        static string BuildLineIdentitySignalValue(string lineId, string status, string fingerprint) {
            List<string> parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(lineId)) {
                parts.Add("line " + lineId);
            }
            if (!string.IsNullOrWhiteSpace(status)) {
                parts.Add(status);
            }
            if (!string.IsNullOrWhiteSpace(fingerprint)) {
                string trimmed = fingerprint.Trim();
                parts.Add("fp " + trimmed.Substring(0, Math.Min(trimmed.Length, 12)));
            }

            return string.Join(" ", parts);
        }

        static LocalizationReviewSignalPresenterModel CreateSignal(string key, string label, string value, string severity) {
            return new LocalizationReviewSignalPresenterModel {
                Key = key,
                Label = label,
                Value = value,
                Severity = severity,
            };
        }

        static string ReviewSeverity(string status) {
            switch (status) {
                case "conflict":
                    return "risk";
                case "changed":
                case "new":
                case "removed":
                case "stale":
                    return "warning";
                default:
                    return "info";
            }
        }

        static string LineIdentitySeverity(string status) {
            if (string.IsNullOrWhiteSpace(status) || status == "available") {
                return "info";
            }

            return status == "drift" ? "risk" : "warning";
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
            return "current: " + item.Text
                + BuildLineIdentitySummary(item.LineId, item.LineIdentityStatus, item.LineFingerprint)
                + " -> previous: " + candidate.Text
                + BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint);
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
