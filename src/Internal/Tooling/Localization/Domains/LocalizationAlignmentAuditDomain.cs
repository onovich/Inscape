using Inscape.Compiler.Compilation;
using Inscape.Compiler.Localization;

namespace Inscape.Tooling {

    public static class LocalizationAlignmentAuditDomain {

        const string KeptStatus = "kept";
        const string NewStatus = "new";
        const string ChangedStatus = "changed";
        const string RemovedStatus = "removed";
        const string ConflictStatus = "conflict";

        public static LocalizationAlignmentReportModel Audit(StoryGraphCompilationResultModel result,
                                                             IReadOnlyList<LocalizationEntryModel> previousEntries,
                                                             StoryNodeMapModel nodeMap,
                                                             string rootPath) {
            LocalizationExtractorDomain extractor = new LocalizationExtractorDomain();
            List<LocalizationEntryModel> currentEntries = extractor.Extract(result.Graph);
            Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle = CreateNodeMapByTitle(nodeMap);
            Dictionary<string, List<LocalizationAlignmentEntry>> previousByAnchor = CreateEntriesByAnchor(previousEntries, nodeMapByTitle, false);
            List<LocalizationAlignmentEntry> previousAlignmentEntries = CreateAlignmentEntries(previousEntries, nodeMapByTitle, false);
            HashSet<string> usedPreviousKeys = new HashSet<string>(System.StringComparer.Ordinal);
            LocalizationAlignmentReportModel report = new LocalizationAlignmentReportModel {
                Workspace = Path.GetFullPath(rootPath),
            };

            for (int i = 0; i < currentEntries.Count; i += 1) {
                LocalizationAlignmentEntry current = CreateAlignmentEntry(currentEntries[i], nodeMapByTitle, true, i);
                if (previousByAnchor.TryGetValue(current.Entry.Anchor, out List<LocalizationAlignmentEntry>? exactMatches)) {
                    LocalizationAlignmentEntry previous = exactMatches[0];
                    usedPreviousKeys.Add(previous.Key);
                    report.Items.Add(CreateItem(KeptStatus, "confirmed", current, previous, 1.0));
                    continue;
                }

                List<LocalizationAlignmentCandidateModel> candidates = FindCandidates(current, previousAlignmentEntries, usedPreviousKeys);
                if (candidates.Count == 0) {
                    report.Items.Add(CreateItem(NewStatus, "needs-translation", current, null, 0));
                } else if (candidates.Count == 1) {
                    LocalizationAlignmentItemModel item = CreateItem(ChangedStatus, "needs-review", current, null, 0);
                    item.Candidates.Add(candidates[0]);
                    report.Items.Add(item);
                } else {
                    LocalizationAlignmentItemModel item = CreateItem(ConflictStatus, "choose-candidate", current, null, 0);
                    item.Candidates.AddRange(candidates);
                    report.Items.Add(item);
                }
            }

            for (int i = 0; i < previousAlignmentEntries.Count; i += 1) {
                LocalizationAlignmentEntry previous = previousAlignmentEntries[i];
                if (usedPreviousKeys.Contains(previous.Key)) {
                    continue;
                }

                bool isCandidate = IsCandidateInReport(report, previous.Entry.Anchor);
                if (isCandidate) {
                    LocalizationAlignmentItemModel staleItem = CreateItem("stale", "needs-review", previous, null, 0);
                    report.Items.Add(staleItem);
                    usedPreviousKeys.Add(previous.Key);
                    continue;
                }

                report.Items.Add(CreateItem(RemovedStatus, "removed-reference", previous, null, 0));
                usedPreviousKeys.Add(previous.Key);
            }

            FinalizeSummary(report);
            return report;
        }

        static Dictionary<string, StoryNodeMapEntryModel> CreateNodeMapByTitle(StoryNodeMapModel nodeMap) {
            Dictionary<string, StoryNodeMapEntryModel> map = new Dictionary<string, StoryNodeMapEntryModel>(System.StringComparer.Ordinal);
            for (int i = 0; i < nodeMap.Nodes.Count; i += 1) {
                StoryNodeMapEntryModel node = nodeMap.Nodes[i];
                if (!string.IsNullOrWhiteSpace(node.Title) && !map.ContainsKey(node.Title)) {
                    map.Add(node.Title, node);
                }
            }
            return map;
        }

        static Dictionary<string, List<LocalizationAlignmentEntry>> CreateEntriesByAnchor(IReadOnlyList<LocalizationEntryModel> entries,
                                                                                         Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle,
                                                                                         bool isCurrent) {
            Dictionary<string, List<LocalizationAlignmentEntry>> map = new Dictionary<string, List<LocalizationAlignmentEntry>>(System.StringComparer.Ordinal);
            for (int i = 0; i < entries.Count; i += 1) {
                LocalizationAlignmentEntry entry = CreateAlignmentEntry(entries[i], nodeMapByTitle, isCurrent, i);
                if (string.IsNullOrWhiteSpace(entry.Entry.Anchor)) {
                    continue;
                }

                if (!map.TryGetValue(entry.Entry.Anchor, out List<LocalizationAlignmentEntry>? list)) {
                    list = new List<LocalizationAlignmentEntry>();
                    map.Add(entry.Entry.Anchor, list);
                }
                list.Add(entry);
            }
            return map;
        }

        static List<LocalizationAlignmentEntry> CreateAlignmentEntries(IReadOnlyList<LocalizationEntryModel> entries,
                                                                       Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle,
                                                                       bool isCurrent) {
            List<LocalizationAlignmentEntry> result = new List<LocalizationAlignmentEntry>();
            for (int i = 0; i < entries.Count; i += 1) {
                result.Add(CreateAlignmentEntry(entries[i], nodeMapByTitle, isCurrent, i));
            }
            return result;
        }

        static LocalizationAlignmentEntry CreateAlignmentEntry(LocalizationEntryModel entry,
                                                               Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle,
                                                               bool isCurrent,
                                                               int index) {
            string nodeId = string.Empty;
            if (nodeMapByTitle.TryGetValue(entry.NodeName, out StoryNodeMapEntryModel? nodeMapEntry)) {
                nodeId = nodeMapEntry.Id;
            }

            return new LocalizationAlignmentEntry {
                Entry = entry,
                NodeId = nodeId,
                Sequence = index,
                Key = (isCurrent ? "current:" : "previous:") + index.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" + entry.Anchor,
            };
        }

        static List<LocalizationAlignmentCandidateModel> FindCandidates(LocalizationAlignmentEntry current,
                                                                        List<LocalizationAlignmentEntry> previousEntries,
                                                                        HashSet<string> usedPreviousKeys) {
            List<ScoredCandidate> scored = new List<ScoredCandidate>();
            for (int i = 0; i < previousEntries.Count; i += 1) {
                LocalizationAlignmentEntry previous = previousEntries[i];
                if (usedPreviousKeys.Contains(previous.Key) || !CanCompare(current, previous)) {
                    continue;
                }

                double similarity = TextSimilarity(current.Entry.Text, previous.Entry.Text);
                if (similarity < 0.62) {
                    continue;
                }

                scored.Add(new ScoredCandidate {
                    Candidate = CreateCandidate(previous, similarity),
                    Score = similarity,
                });
            }

            scored.Sort(static (left, right) => right.Score.CompareTo(left.Score));
            if (scored.Count == 0) {
                return new List<LocalizationAlignmentCandidateModel>();
            }

            double best = scored[0].Score;
            List<LocalizationAlignmentCandidateModel> result = new List<LocalizationAlignmentCandidateModel>();
            for (int i = 0; i < scored.Count; i += 1) {
                if (i >= 4 || best - scored[i].Score > 0.08) {
                    break;
                }
                result.Add(scored[i].Candidate);
            }

            return result;
        }

        static bool CanCompare(LocalizationAlignmentEntry current, LocalizationAlignmentEntry previous) {
            if (!string.IsNullOrWhiteSpace(current.NodeId)
                && !string.IsNullOrWhiteSpace(previous.NodeId)
                && current.NodeId != previous.NodeId) {
                return false;
            }

            if (current.Entry.NodeName != previous.Entry.NodeName && (string.IsNullOrWhiteSpace(current.NodeId) || string.IsNullOrWhiteSpace(previous.NodeId))) {
                return false;
            }

            if (current.Entry.Kind != previous.Entry.Kind) {
                return false;
            }

            if (!string.IsNullOrWhiteSpace(current.Entry.Speaker)
                || !string.IsNullOrWhiteSpace(previous.Entry.Speaker)) {
                return current.Entry.Speaker == previous.Entry.Speaker;
            }

            return true;
        }

        static LocalizationAlignmentItemModel CreateItem(string status,
                                                         string review,
                                                         LocalizationAlignmentEntry current,
                                                         LocalizationAlignmentEntry? previous,
                                                         double similarity) {
            LocalizationEntryModel entry = current.Entry;
            LocalizationAlignmentItemModel item = new LocalizationAlignmentItemModel {
                Status = status,
                Review = review,
                Anchor = entry.Anchor,
                NodeId = current.NodeId,
                NodeTitle = entry.NodeName,
                Kind = entry.Kind,
                Speaker = entry.Speaker,
                Text = entry.Text,
                Translation = status == KeptStatus && previous != null ? previous.Entry.Translation : string.Empty,
                SourcePath = entry.Source.SourcePath,
                Line = entry.Source.Line,
                Column = entry.Source.Column,
            };

            if (previous != null) {
                item.Candidates.Add(CreateCandidate(previous, similarity));
            }

            return item;
        }

        static LocalizationAlignmentCandidateModel CreateCandidate(LocalizationAlignmentEntry entry, double similarity) {
            return new LocalizationAlignmentCandidateModel {
                Anchor = entry.Entry.Anchor,
                NodeId = entry.NodeId,
                NodeTitle = entry.Entry.NodeName,
                Kind = entry.Entry.Kind,
                Speaker = entry.Entry.Speaker,
                Text = entry.Entry.Text,
                Translation = entry.Entry.Translation,
                SourcePath = entry.Entry.Source.SourcePath,
                Line = entry.Entry.Source.Line,
                Column = entry.Entry.Source.Column,
                Similarity = Math.Round(similarity, 4),
            };
        }

        static bool IsCandidateInReport(LocalizationAlignmentReportModel report, string anchor) {
            for (int i = 0; i < report.Items.Count; i += 1) {
                LocalizationAlignmentItemModel item = report.Items[i];
                for (int candidateIndex = 0; candidateIndex < item.Candidates.Count; candidateIndex += 1) {
                    if (item.Candidates[candidateIndex].Anchor == anchor) {
                        return true;
                    }
                }
            }
            return false;
        }

        static void FinalizeSummary(LocalizationAlignmentReportModel report) {
            LocalizationAlignmentSummaryModel summary = new LocalizationAlignmentSummaryModel();
            for (int i = 0; i < report.Items.Count; i += 1) {
                switch (report.Items[i].Status) {
                    case KeptStatus:
                        summary.KeptCount += 1;
                        break;
                    case NewStatus:
                        summary.NewCount += 1;
                        break;
                    case ChangedStatus:
                        summary.ChangedCount += 1;
                        break;
                    case RemovedStatus:
                        summary.RemovedCount += 1;
                        break;
                    case ConflictStatus:
                        summary.ConflictCount += 1;
                        break;
                    case "stale":
                        summary.StaleCount += 1;
                        break;
                }
            }
            report.Summary = summary;
        }

        static double TextSimilarity(string left, string right) {
            string a = NormalizeText(left);
            string b = NormalizeText(right);
            if (a.Length == 0 && b.Length == 0) {
                return 1;
            }

            if (a.Length == 0 || b.Length == 0) {
                return 0;
            }

            if (a == b) {
                return 1;
            }

            int distance = LevenshteinDistance(a, b);
            int maxLength = Math.Max(a.Length, b.Length);
            return 1.0 - ((double)distance / maxLength);
        }

        static string NormalizeText(string text) {
            return string.Join(" ", (text ?? string.Empty).Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        }

        static int LevenshteinDistance(string left, string right) {
            int[,] distances = new int[left.Length + 1, right.Length + 1];
            for (int i = 0; i <= left.Length; i += 1) {
                distances[i, 0] = i;
            }
            for (int j = 0; j <= right.Length; j += 1) {
                distances[0, j] = j;
            }

            for (int i = 1; i <= left.Length; i += 1) {
                for (int j = 1; j <= right.Length; j += 1) {
                    int cost = left[i - 1] == right[j - 1] ? 0 : 1;
                    distances[i, j] = Math.Min(Math.Min(distances[i - 1, j] + 1, distances[i, j - 1] + 1), distances[i - 1, j - 1] + cost);
                }
            }

            return distances[left.Length, right.Length];
        }

        sealed class LocalizationAlignmentEntry {

            public LocalizationEntryModel Entry { get; set; } = new LocalizationEntryModel();

            public string NodeId { get; set; } = string.Empty;

            public int Sequence { get; set; }

            public string Key { get; set; } = string.Empty;

        }

        sealed class ScoredCandidate {

            public LocalizationAlignmentCandidateModel Candidate { get; set; } = new LocalizationAlignmentCandidateModel();

            public double Score { get; set; }

        }

    }

}
