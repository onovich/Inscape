using Inscape.Compiler.Compilation;
using Inscape.Compiler.Localization;

namespace Inscape.Tooling {

    public static class LocalizationAlignmentAuditDomain {

        const string KeptStatus = "kept";
        const string NewStatus = "new";
        const string ChangedStatus = "changed";
        const string RemovedStatus = "removed";
        const string ConflictStatus = "conflict";
        const string StaleStatus = "stale";
        const double ChangedSimilarityThreshold = 0.72;
        const double ConflictSimilarityWindow = 0.05;
        const double CandidateSimilarityThreshold = 0.62;
        const int SequencePenaltyWeight = 2;
        const int LinePenaltyWeight = 1;
        const int ContextPenaltyWeight = 3;
        const int FingerprintPenaltyWeight = 4;
        const int NeighborPenaltyWeight = 5;
        const int LocalContextPenaltyWeight = 6;
        const int LineIdentityPenaltyWeight = 8;
        const double LocalContextNearSimilarityThreshold = 0.72;

        public static LocalizationAlignmentReportModel Audit(StoryGraphCompilationResultModel result,
                                                             IReadOnlyList<LocalizationEntryModel> previousEntries,
                                                             StoryNodeMapModel nodeMap,
                                                             string rootPath) {
            return Audit(result,
                         previousEntries,
                         nodeMap,
                         rootPath,
                         new LocalizationAlignmentLineIdentityInputModel {
                             Status = "missing",
                             Message = "Localization line sidecar was not provided.",
                         });
        }

        public static LocalizationAlignmentReportModel Audit(StoryGraphCompilationResultModel result,
                                                             IReadOnlyList<LocalizationEntryModel> previousEntries,
                                                             StoryNodeMapModel nodeMap,
                                                             string rootPath,
                                                             LocalizationAlignmentLineIdentityInputModel lineIdentity) {
            LocalizationExtractorDomain extractor = new LocalizationExtractorDomain();
            List<LocalizationEntryModel> currentEntries = extractor.Extract(result.Graph);
            Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle = CreateNodeMapByTitle(nodeMap);
            LocalizationLineIdentityLookup lineIdentityLookup = CreateLineIdentityLookup(lineIdentity, rootPath);
            List<LocalizationAlignmentEntry> currentAlignmentEntries = CreateAlignmentEntries(currentEntries, nodeMapByTitle, lineIdentityLookup, rootPath, true);
            Dictionary<string, List<LocalizationAlignmentEntry>> previousByAnchor = CreateEntriesByAnchor(previousEntries, nodeMapByTitle, lineIdentityLookup, rootPath, false);
            List<LocalizationAlignmentEntry> previousAlignmentEntries = CreateAlignmentEntries(previousEntries, nodeMapByTitle, lineIdentityLookup, rootPath, false);
            HashSet<string> usedPreviousKeys = new HashSet<string>(System.StringComparer.Ordinal);
            LocalizationAlignmentReportModel report = new LocalizationAlignmentReportModel {
                Workspace = Path.GetFullPath(rootPath),
                LineIdentity = CreateReportLineIdentity(lineIdentity),
            };

            for (int i = 0; i < currentAlignmentEntries.Count; i += 1) {
                LocalizationAlignmentEntry current = currentAlignmentEntries[i];
                if (previousByAnchor.TryGetValue(current.Entry.Anchor, out List<LocalizationAlignmentEntry>? exactMatches)) {
                    LocalizationAlignmentEntry previous = exactMatches[0];
                    usedPreviousKeys.Add(previous.Key);
                    report.Items.Add(CreateItem(KeptStatus, "confirmed", current, previous, 1.0));
                    continue;
                }

                List<LocalizationAlignmentCandidateMatch> candidates = FindCandidates(current, previousAlignmentEntries, usedPreviousKeys);
                if (candidates.Count == 0) {
                    report.Items.Add(CreateItem(NewStatus, "needs-translation", current, null, 0));
                } else if (candidates.Count == 1 && candidates[0].Similarity >= ChangedSimilarityThreshold) {
                    LocalizationAlignmentItemModel item = CreateItem(ChangedStatus, "needs-review", current, null, 0);
                    item.Candidates.Add(candidates[0].Candidate);
                    report.Items.Add(item);
                } else {
                    LocalizationAlignmentItemModel item = CreateItem(ConflictStatus, "choose-candidate", current, null, 0);
                    for (int candidateIndex = 0; candidateIndex < candidates.Count; candidateIndex += 1) {
                        item.Candidates.Add(candidates[candidateIndex].Candidate);
                    }
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
                    LocalizationAlignmentItemModel staleItem = CreateItem(StaleStatus, "needs-review", previous, null, 0);
                    report.Items.Add(staleItem);
                    usedPreviousKeys.Add(previous.Key);
                    continue;
                }

                report.Items.Add(CreateItem(RemovedStatus, "removed-reference", previous, null, 0));
                usedPreviousKeys.Add(previous.Key);
            }

            FinalizeSummary(report);
            report.Presenter = LocalizationReviewPresenterModelBuilderDomain.Build(report);
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
                                                                                         LocalizationLineIdentityLookup lineIdentityLookup,
                                                                                         string rootPath,
                                                                                         bool isCurrent) {
            Dictionary<string, List<LocalizationAlignmentEntry>> map = new Dictionary<string, List<LocalizationAlignmentEntry>>(System.StringComparer.Ordinal);
            Dictionary<string, int> lineCounters = new Dictionary<string, int>(System.StringComparer.Ordinal);
            for (int i = 0; i < entries.Count; i += 1) {
                LocalizationAlignmentEntry entry = CreateAlignmentEntry(entries[i], nodeMapByTitle, lineIdentityLookup, rootPath, lineCounters, isCurrent, i);
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
                                                                       LocalizationLineIdentityLookup lineIdentityLookup,
                                                                       string rootPath,
                                                                       bool isCurrent) {
            List<LocalizationAlignmentEntry> result = new List<LocalizationAlignmentEntry>();
            Dictionary<string, int> lineCounters = new Dictionary<string, int>(System.StringComparer.Ordinal);
            for (int i = 0; i < entries.Count; i += 1) {
                result.Add(CreateAlignmentEntry(entries[i], nodeMapByTitle, lineIdentityLookup, rootPath, lineCounters, isCurrent, i));
            }
            ApplyLocalContext(result);
            return result;
        }

        static LocalizationAlignmentEntry CreateAlignmentEntry(LocalizationEntryModel entry,
                                                               Dictionary<string, StoryNodeMapEntryModel> nodeMapByTitle,
                                                               LocalizationLineIdentityLookup lineIdentityLookup,
                                                               string rootPath,
                                                               Dictionary<string, int> lineCounters,
                                                               bool isCurrent,
                                                               int index) {
            string nodeId = string.Empty;
            if (nodeMapByTitle.TryGetValue(entry.NodeName, out StoryNodeMapEntryModel? nodeMapEntry)) {
                nodeId = nodeMapEntry.Id;
            }

            LocalizationAlignmentEntry result = new LocalizationAlignmentEntry {
                Entry = entry,
                NodeId = nodeId,
                Sequence = index,
                Key = (isCurrent ? "current:" : "previous:") + index.ToString(System.Globalization.CultureInfo.InvariantCulture) + ":" + entry.Anchor,
            };
            ApplyLineIdentity(result, lineIdentityLookup, rootPath, lineCounters);
            return result;
        }

        static void ApplyLocalContext(List<LocalizationAlignmentEntry> entries) {
            for (int i = 0; i < entries.Count; i += 1) {
                LocalizationAlignmentEntry current = entries[i];
                if (i > 0 && IsSameLocalizationBlock(entries[i - 1], current)) {
                    current.PreviousContextFingerprint = LocalContextFingerprint(entries[i - 1].Entry.Text);
                }

                if (i + 1 < entries.Count && IsSameLocalizationBlock(entries[i + 1], current)) {
                    current.NextContextFingerprint = LocalContextFingerprint(entries[i + 1].Entry.Text);
                }
            }
        }

        static bool IsSameLocalizationBlock(LocalizationAlignmentEntry left, LocalizationAlignmentEntry right) {
            return left.Entry.NodeName == right.Entry.NodeName
                && NormalizeContextSourcePath(left.Entry.Source.SourcePath) == NormalizeContextSourcePath(right.Entry.Source.SourcePath);
        }

        static string LocalContextFingerprint(string text) {
            return NormalizeText(text);
        }

        static string NormalizeContextSourcePath(string sourcePath) {
            return (sourcePath ?? string.Empty).Replace('\\', '/');
        }

        static LocalizationAlignmentLineIdentityModel CreateReportLineIdentity(LocalizationAlignmentLineIdentityInputModel input) {
            return new LocalizationAlignmentLineIdentityModel {
                Status = input.Status,
                Path = input.Path,
                Message = input.Message,
                HasDrift = input.HasDrift,
            };
        }

        static LocalizationLineIdentityLookup CreateLineIdentityLookup(LocalizationAlignmentLineIdentityInputModel input,
                                                                       string rootPath) {
            LocalizationLineIdentityLookup lookup = new LocalizationLineIdentityLookup {
                Status = input.Status,
            };
            if (input.Status != "available") {
                return lookup;
            }

            for (int documentIndex = 0; documentIndex < input.LineMap.Documents.Count; documentIndex += 1) {
                LocalizationLineMapDocumentModel document = input.LineMap.Documents[documentIndex];
                string sourcePath = NormalizeSourcePath(rootPath, document.SourcePath);
                for (int blockIndex = 0; blockIndex < document.Blocks.Count; blockIndex += 1) {
                    LocalizationLineMapBlockModel block = document.Blocks[blockIndex];
                    for (int lineIndex = 0; lineIndex < block.Lines.Count; lineIndex += 1) {
                        LocalizationLineMapEntryModel line = block.Lines[lineIndex];
                        LocalizationLineIdentityEntry identity = new LocalizationLineIdentityEntry {
                            LineId = line.LineId,
                            Fingerprint = line.Fingerprint,
                            LineNumber = line.LineNumber,
                            Status = "available",
                        };
                        string blockKey = string.IsNullOrWhiteSpace(block.BlockTitle) ? block.BlockId : block.BlockTitle;
                        lookup.ByKey[CreateLineIdentityKey(sourcePath, blockKey, NormalizeLineKind(line.Kind), line.Speaker, line.LineNumber)] = identity;
                    }
                }
            }

            return lookup;
        }

        static void ApplyLineIdentity(LocalizationAlignmentEntry entry,
                                      LocalizationLineIdentityLookup lookup,
                                      string rootPath,
                                      Dictionary<string, int> lineCounters) {
            if (lookup.Status != "available") {
                entry.LineIdentityStatus = lookup.Status;
                return;
            }

            string sourcePath = NormalizeSourcePath(rootPath, entry.Entry.Source.SourcePath);
            string kind = NormalizeLineKind(entry.Entry.Kind);
            string counterKey = sourcePath + "\n" + entry.Entry.NodeName;
            lineCounters.TryGetValue(counterKey, out int currentCount);
            int lineNumber = currentCount + 1;
            lineCounters[counterKey] = lineNumber;

            string identityKey = CreateLineIdentityKey(sourcePath, entry.Entry.NodeName, kind, entry.Entry.Speaker, lineNumber);
            if (lookup.ByKey.TryGetValue(identityKey, out LocalizationLineIdentityEntry? identity)) {
                entry.LineId = identity.LineId;
                entry.LineFingerprint = identity.Fingerprint;
                entry.LineIdentityStatus = identity.Status;
            } else {
                entry.LineIdentityStatus = "unmatched";
            }
        }

        static string CreateLineIdentityKey(string sourcePath,
                                            string blockTitle,
                                            string kind,
                                            string speaker,
                                            int lineNumber) {
            return sourcePath + "\n"
                + blockTitle + "\n"
                + kind + "\n"
                + speaker + "\n"
                + lineNumber.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        static string NormalizeLineKind(string kind) {
            return kind switch {
                "Dialogue" => "dialogue",
                "ChoicePrompt" => "choice-prompt",
                "ChoiceOption" => "choice-option",
                _ => kind.ToLowerInvariant(),
            };
        }

        static string NormalizeSourcePath(string rootPath, string sourcePath) {
            if (string.IsNullOrWhiteSpace(sourcePath)) {
                return string.Empty;
            }

            string normalizedSource = sourcePath.Replace('\\', '/');
            if (!Path.IsPathRooted(sourcePath)) {
                return normalizedSource;
            }

            string full = Path.GetFullPath(sourcePath);
            string root = Path.GetFullPath(rootPath);
            if (!full.StartsWith(root, System.StringComparison.OrdinalIgnoreCase)) {
                return normalizedSource;
            }

            return Path.GetRelativePath(root, full).Replace('\\', '/');
        }

        static List<LocalizationAlignmentCandidateMatch> FindCandidates(LocalizationAlignmentEntry current,
                                                                        List<LocalizationAlignmentEntry> previousEntries,
                                                                        HashSet<string> usedPreviousKeys) {
            List<LocalizationAlignmentCandidateMatch> scored = new List<LocalizationAlignmentCandidateMatch>();
            for (int i = 0; i < previousEntries.Count; i += 1) {
                LocalizationAlignmentEntry previous = previousEntries[i];
                if (usedPreviousKeys.Contains(previous.Key) || !CanCompare(current, previous)) {
                    continue;
                }

                CandidateScore score = ScoreCandidate(current, previous);
                if (score.Similarity < CandidateSimilarityThreshold) {
                    continue;
                }

                scored.Add(new LocalizationAlignmentCandidateMatch {
                    Candidate = CreateCandidate(previous, score.Similarity, score.Reason),
                    Similarity = score.Similarity,
                    SequenceDistance = score.SequenceDistance,
                    RankingPenalty = score.RankingPenalty,
                    HasExactLineIdentity = score.HasExactLineIdentity,
                });
            }

            scored.Sort(static (left, right) => CompareCandidateMatch(left, right));
            if (scored.Count == 0) {
                return new List<LocalizationAlignmentCandidateMatch>();
            }

            LocalizationAlignmentCandidateMatch best = scored[0];
            List<LocalizationAlignmentCandidateMatch> result = new List<LocalizationAlignmentCandidateMatch>();
            for (int i = 0; i < scored.Count; i += 1) {
                if (i >= 4) {
                    break;
                }

                LocalizationAlignmentCandidateMatch candidate = scored[i];
                if (!ShouldKeepCandidate(best, candidate)) {
                    break;
                }

                result.Add(candidate);
            }

            return result;
        }

        static bool ShouldKeepCandidate(LocalizationAlignmentCandidateMatch best, LocalizationAlignmentCandidateMatch candidate) {
            if (ReferenceEquals(best, candidate)) {
                return true;
            }

            if (best.Similarity >= ChangedSimilarityThreshold && best.Similarity - candidate.Similarity > ConflictSimilarityWindow) {
                return false;
            }

            if (best.Similarity < ChangedSimilarityThreshold && best.Similarity - candidate.Similarity > 0.12) {
                return false;
            }

            if (best.HasExactLineIdentity && !candidate.HasExactLineIdentity && best.Similarity >= ChangedSimilarityThreshold) {
                return false;
            }

            return true;
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
                LineId = current.LineId,
                LineFingerprint = current.LineFingerprint,
                LineIdentityStatus = current.LineIdentityStatus,
            };

            if (previous != null) {
                item.Candidates.Add(CreateCandidate(previous, similarity, string.Empty));
            }

            return item;
        }

        static LocalizationAlignmentCandidateModel CreateCandidate(LocalizationAlignmentEntry entry, double similarity, string reason) {
            return new LocalizationAlignmentCandidateModel {
                Reason = reason,
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
                LineId = entry.LineId,
                LineFingerprint = entry.LineFingerprint,
                LineIdentityStatus = entry.LineIdentityStatus,
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
                    case StaleStatus:
                        summary.StaleCount += 1;
                        break;
                }
            }
            report.Summary = summary;
        }

        static CandidateScore ScoreCandidate(LocalizationAlignmentEntry current, LocalizationAlignmentEntry previous) {
            double similarity = TextSimilarity(current.Entry.Text, previous.Entry.Text);
            int sequenceDistance = Math.Abs(current.Sequence - previous.Sequence);
            int lineDistance = Math.Abs(current.Entry.Source.Line - previous.Entry.Source.Line);
            int exactPrefixLength = SharedPrefixLength(NormalizeText(current.Entry.Text), NormalizeText(previous.Entry.Text));
            int contextDistance = ContextDistance(current.Entry.Text, previous.Entry.Text);
            int fingerprintDistance = FingerprintDistance(current.Entry.Text, previous.Entry.Text);
            int neighborDistance = NeighborDistance(current.Entry.Text, previous.Entry.Text);
            int localContextDistance = LocalContextDistance(current, previous);
            int lineIdentityDistance = LineIdentityDistance(current, previous);
            List<string> reasons = new List<string>();
            int rankingPenalty = sequenceDistance * SequencePenaltyWeight
                + lineDistance * LinePenaltyWeight
                + contextDistance * ContextPenaltyWeight
                + fingerprintDistance * FingerprintPenaltyWeight
                + neighborDistance * NeighborPenaltyWeight
                + localContextDistance * LocalContextPenaltyWeight
                + lineIdentityDistance * LineIdentityPenaltyWeight;

            if (current.NodeId.Length > 0 && current.NodeId == previous.NodeId) {
                reasons.Add("same-stable-node");
                rankingPenalty = Math.Max(0, rankingPenalty - 2);
            }
            if (sequenceDistance == 0) {
                reasons.Add("same-sequence");
                rankingPenalty = Math.Max(0, rankingPenalty - 2);
            } else if (sequenceDistance <= 1) {
                reasons.Add("near-sequence");
                similarity += 0.015;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (lineDistance <= 1) {
                reasons.Add("near-source-line");
                similarity += 0.01;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (exactPrefixLength >= 8) {
                reasons.Add("shared-prefix");
                similarity += 0.02;
            }
            if (contextDistance == 0) {
                reasons.Add("same-context-shape");
                similarity += 0.015;
                rankingPenalty = Math.Max(0, rankingPenalty - 2);
            } else if (contextDistance == 1) {
                reasons.Add("near-context-shape");
                similarity += 0.008;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (fingerprintDistance == 0) {
                reasons.Add("same-keyword-fingerprint");
                similarity += 0.012;
                rankingPenalty = Math.Max(0, rankingPenalty - 2);
            } else if (fingerprintDistance == 1) {
                reasons.Add("near-keyword-fingerprint");
                similarity += 0.006;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (neighborDistance == 0) {
                reasons.Add("same-neighbor-shape");
                similarity += 0.01;
                rankingPenalty = Math.Max(0, rankingPenalty - 2);
            } else if (neighborDistance == 1) {
                reasons.Add("near-neighbor-shape");
                similarity += 0.004;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (localContextDistance == 0) {
                reasons.Add("same-local-context");
                similarity += 0.018;
                rankingPenalty = Math.Max(0, rankingPenalty - 3);
            } else if (localContextDistance == 1) {
                reasons.Add("near-local-context");
                similarity += 0.008;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }
            if (lineIdentityDistance == 0 && !string.IsNullOrWhiteSpace(current.LineId)) {
                reasons.Add("same-line-id");
                similarity += 0.035;
                rankingPenalty = Math.Max(0, rankingPenalty - 6);
            } else if (lineIdentityDistance == 1) {
                reasons.Add("near-line-order");
                similarity += 0.008;
                rankingPenalty = Math.Max(0, rankingPenalty - 1);
            }

            return new CandidateScore {
                Similarity = Math.Min(0.9999, similarity),
                SequenceDistance = sequenceDistance,
                RankingPenalty = rankingPenalty,
                Reason = string.Join(",", reasons),
                HasExactLineIdentity = lineIdentityDistance == 0 && !string.IsNullOrWhiteSpace(current.LineId),
            };
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

        static int SharedPrefixLength(string left, string right) {
            int limit = Math.Min(left.Length, right.Length);
            int count = 0;
            while (count < limit && left[count] == right[count]) {
                count += 1;
            }

            return count;
        }

        static int ContextDistance(string left, string right) {
            string contextLeft = ContextShape(NormalizeText(left));
            string contextRight = ContextShape(NormalizeText(right));
            if (contextLeft == contextRight) {
                return 0;
            }

            int distance = LevenshteinDistance(contextLeft, contextRight);
            return distance <= 1 ? 1 : 2;
        }

        static string ContextShape(string value) {
            string[] parts = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) {
                return string.Empty;
            }

            if (parts.Length == 1) {
                return parts[0];
            }

            return parts[0] + "|" + parts[parts.Length - 1] + "|" + parts.Length.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        static int FingerprintDistance(string left, string right) {
            string[] leftTokens = FingerprintTokens(NormalizeText(left));
            string[] rightTokens = FingerprintTokens(NormalizeText(right));
            if (leftTokens.Length == 0 && rightTokens.Length == 0) {
                return 0;
            }

            int shared = 0;
            for (int i = 0; i < leftTokens.Length; i += 1) {
                for (int j = 0; j < rightTokens.Length; j += 1) {
                    if (leftTokens[i] == rightTokens[j]) {
                        shared += 1;
                        break;
                    }
                }
            }

            int max = Math.Max(leftTokens.Length, rightTokens.Length);
            if (shared == max) {
                return 0;
            }

            return shared >= Math.Max(1, max - 1) ? 1 : 2;
        }

        static string[] FingerprintTokens(string value) {
            string[] tokens = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            List<string> result = new List<string>();
            for (int i = 0; i < tokens.Length; i += 1) {
                string token = tokens[i].Trim().Trim('.', ',', '!', '?', ';', ':', '"', '\'', '(', ')', '[', ']');
                if (token.Length >= 4) {
                    result.Add(token.ToLowerInvariant());
                }
            }

            return result.ToArray();
        }

        static int NeighborDistance(string left, string right) {
            string leftNeighbor = NeighborShape(NormalizeText(left));
            string rightNeighbor = NeighborShape(NormalizeText(right));
            if (leftNeighbor == rightNeighbor) {
                return 0;
            }

            int distance = LevenshteinDistance(leftNeighbor, rightNeighbor);
            return distance <= 2 ? 1 : 2;
        }

        static int LocalContextDistance(LocalizationAlignmentEntry current, LocalizationAlignmentEntry previous) {
            int compared = 0;
            int exactMatches = 0;
            int nearMatches = 0;

            if (!string.IsNullOrWhiteSpace(current.PreviousContextFingerprint)
                && !string.IsNullOrWhiteSpace(previous.PreviousContextFingerprint)) {
                compared += 1;
                int distance = LocalContextFingerprintDistance(current.PreviousContextFingerprint, previous.PreviousContextFingerprint);
                if (distance == 0) {
                    exactMatches += 1;
                    nearMatches += 1;
                } else if (distance == 1) {
                    nearMatches += 1;
                }
            }

            if (!string.IsNullOrWhiteSpace(current.NextContextFingerprint)
                && !string.IsNullOrWhiteSpace(previous.NextContextFingerprint)) {
                compared += 1;
                int distance = LocalContextFingerprintDistance(current.NextContextFingerprint, previous.NextContextFingerprint);
                if (distance == 0) {
                    exactMatches += 1;
                    nearMatches += 1;
                } else if (distance == 1) {
                    nearMatches += 1;
                }
            }

            if (compared == 0) {
                return 2;
            }

            if (exactMatches == compared) {
                return 0;
            }

            return nearMatches > 0 ? 1 : 2;
        }

        static int LocalContextFingerprintDistance(string left, string right) {
            if (left == right) {
                return 0;
            }

            return TextSimilarity(left, right) >= LocalContextNearSimilarityThreshold ? 1 : 2;
        }

        static int LineIdentityDistance(LocalizationAlignmentEntry current, LocalizationAlignmentEntry previous) {
            if (string.IsNullOrWhiteSpace(current.LineId) || string.IsNullOrWhiteSpace(previous.LineId)) {
                return 2;
            }

            if (current.LineId == previous.LineId) {
                return 0;
            }

            return current.Entry.NodeName == previous.Entry.NodeName ? 1 : 2;
        }

        static string NeighborShape(string value) {
            string[] tokens = value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (tokens.Length == 0) {
                return string.Empty;
            }

            if (tokens.Length == 1) {
                return tokens[0];
            }

            string middle = tokens.Length > 2 ? tokens[1] : string.Empty;
            return tokens[0] + "|" + middle + "|" + tokens[tokens.Length - 1];
        }

        static int CompareCandidateMatch(LocalizationAlignmentCandidateMatch left, LocalizationAlignmentCandidateMatch right) {
            int similarity = right.Similarity.CompareTo(left.Similarity);
            if (similarity != 0) {
                return similarity;
            }

            int penalty = left.RankingPenalty.CompareTo(right.RankingPenalty);
            if (penalty != 0) {
                return penalty;
            }

            return left.SequenceDistance.CompareTo(right.SequenceDistance);
        }

        sealed class LocalizationAlignmentEntry {

            public LocalizationEntryModel Entry { get; set; } = new LocalizationEntryModel();

            public string NodeId { get; set; } = string.Empty;

            public int Sequence { get; set; }

            public string Key { get; set; } = string.Empty;

            public string LineId { get; set; } = string.Empty;

            public string LineFingerprint { get; set; } = string.Empty;

            public string LineIdentityStatus { get; set; } = string.Empty;

            public string PreviousContextFingerprint { get; set; } = string.Empty;

            public string NextContextFingerprint { get; set; } = string.Empty;

        }

        sealed class LocalizationLineIdentityLookup {

            public string Status { get; set; } = string.Empty;

            public Dictionary<string, LocalizationLineIdentityEntry> ByKey { get; set; } = new Dictionary<string, LocalizationLineIdentityEntry>(System.StringComparer.Ordinal);

        }

        sealed class LocalizationLineIdentityEntry {

            public string LineId { get; set; } = string.Empty;

            public string Fingerprint { get; set; } = string.Empty;

            public int LineNumber { get; set; }

            public string Status { get; set; } = string.Empty;

        }

        sealed class LocalizationAlignmentCandidateMatch {

            public LocalizationAlignmentCandidateModel Candidate { get; set; } = new LocalizationAlignmentCandidateModel();

            public double Similarity { get; set; }

            public int SequenceDistance { get; set; }

            public int RankingPenalty { get; set; }

            public bool HasExactLineIdentity { get; set; }

        }

        sealed class CandidateScore {

            public double Similarity { get; set; }

            public int SequenceDistance { get; set; }

            public int RankingPenalty { get; set; }

            public string Reason { get; set; } = string.Empty;

            public bool HasExactLineIdentity { get; set; }

        }

    }

}
