using System.Security.Cryptography;
using System.Text;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class StoryNodeMapUpdateDomain {

        const string ActiveStatus = "active";
        const string MissingStatus = "missing";
        const string ConflictStatus = "conflict";

        public static StoryNodeMapModel Update(StoryNodeMapModel existingMap,
                                               StoryGraphCompilationResultModel result,
                                               string rootPath,
                                               DateTimeOffset utcNow) {
            StoryNodeMapModel currentMap = Clone(existingMap);
            string timestamp = utcNow.ToUniversalTime().ToString("O", System.Globalization.CultureInfo.InvariantCulture);
            List<StoryNodeMapEntryModel> existingNodes = CreateConflictAwareNodes(currentMap.Nodes);
            List<StoryNodeMapEntryModel> updatedNodes = new List<StoryNodeMapEntryModel>();
            HashSet<string> matchedIds = new HashSet<string>(System.StringComparer.Ordinal);
            List<StoryNodeMapNodeSnapshot> nodeSnapshots = BuildNodeSnapshots(result.Graph.Nodes, rootPath);

            for (int nodeIndex = 0; nodeIndex < nodeSnapshots.Count; nodeIndex += 1) {
                StoryNodeMapNodeSnapshot snapshot = nodeSnapshots[nodeIndex];
                StoryNodeMapEntryModel entry = FindByTitle(existingNodes, snapshot.Title, matchedIds)
                    ?? FindRenameCandidate(existingNodes, snapshot, matchedIds)
                    ?? CreateNewEntry(timestamp);
                StoryNodeMapEntryModel updated = Clone(entry);

                AddPreviousTitleIfRenamed(updated, snapshot.Title);
                updated.Title = snapshot.Title;
                updated.SourcePath = snapshot.SourcePath;
                updated.SourceLine = snapshot.SourceLine;
                updated.SourceCharacter = snapshot.SourceCharacter;
                updated.FirstContentFingerprint = snapshot.FirstContentFingerprint;
                updated.NeighborFingerprint = snapshot.NeighborFingerprint;
                updated.LineAnchorSamples = new List<string>(snapshot.LineAnchorSamples);
                updated.Status = ActiveStatus;
                updated.UpdatedAt = timestamp;
                if (string.IsNullOrWhiteSpace(updated.CreatedAt)) {
                    updated.CreatedAt = timestamp;
                }

                updatedNodes.Add(updated);
                matchedIds.Add(updated.Id);
            }

            for (int nodeIndex = 0; nodeIndex < existingNodes.Count; nodeIndex += 1) {
                StoryNodeMapEntryModel existing = existingNodes[nodeIndex];
                if (matchedIds.Contains(existing.Id)) {
                    continue;
                }

                StoryNodeMapEntryModel retained = Clone(existing);
                if (retained.Status != ConflictStatus) {
                    retained.Status = MissingStatus;
                    retained.UpdatedAt = timestamp;
                }
                updatedNodes.Add(retained);
            }

            updatedNodes.Sort(CompareNodes);
            currentMap.Nodes = updatedNodes;
            currentMap.Tombstones.Sort(CompareTombstones);
            currentMap.Format = "inscape.node-map";
            currentMap.FormatVersion = 1;
            return currentMap;
        }

        static List<StoryNodeMapNodeSnapshot> BuildNodeSnapshots(List<StoryGraphNodeModel> nodes, string rootPath) {
            List<StoryNodeMapNodeSnapshot> snapshots = new List<StoryNodeMapNodeSnapshot>(nodes.Count);
            for (int nodeIndex = 0; nodeIndex < nodes.Count; nodeIndex += 1) {
                StoryGraphNodeModel node = nodes[nodeIndex];
                snapshots.Add(new StoryNodeMapNodeSnapshot {
                    Title = node.Name,
                    SourcePath = NormalizeSourcePath(rootPath, node.Source.SourcePath),
                    SourceLine = node.Source.Line,
                    SourceCharacter = node.Source.Column <= 0 ? 0 : node.Source.Column - 1,
                    FirstContentFingerprint = BuildFirstContentFingerprint(node),
                    NeighborFingerprint = BuildNeighborFingerprint(nodes, nodeIndex),
                    LineAnchorSamples = CollectLineAnchorSamples(node),
                });
            }

            return snapshots;
        }

        static List<StoryNodeMapEntryModel> CreateConflictAwareNodes(List<StoryNodeMapEntryModel> nodes) {
            List<StoryNodeMapEntryModel> copies = new List<StoryNodeMapEntryModel>(nodes.Count);
            for (int i = 0; i < nodes.Count; i += 1) {
                copies.Add(Clone(nodes[i]));
            }

            HashSet<string> duplicateIds = FindDuplicates(copies, static node => node.Id);
            HashSet<string> duplicateTitles = FindDuplicates(copies, static node => node.Title);

            for (int i = 0; i < copies.Count; i += 1) {
                StoryNodeMapEntryModel node = copies[i];
                if ((node.Id.Length > 0 && duplicateIds.Contains(node.Id))
                    || (node.Title.Length > 0 && duplicateTitles.Contains(node.Title))) {
                    node.Status = ConflictStatus;
                }
            }

            return copies;
        }

        static HashSet<string> FindDuplicates(List<StoryNodeMapEntryModel> nodes, Func<StoryNodeMapEntryModel, string> keySelector) {
            Dictionary<string, int> counts = new Dictionary<string, int>(System.StringComparer.Ordinal);
            for (int i = 0; i < nodes.Count; i += 1) {
                string key = keySelector(nodes[i]);
                if (string.IsNullOrWhiteSpace(key)) {
                    continue;
                }

                counts.TryGetValue(key, out int count);
                counts[key] = count + 1;
            }

            HashSet<string> duplicates = new HashSet<string>(System.StringComparer.Ordinal);
            foreach (KeyValuePair<string, int> pair in counts) {
                if (pair.Value > 1) {
                    duplicates.Add(pair.Key);
                }
            }

            return duplicates;
        }

        static StoryNodeMapEntryModel? FindByTitle(List<StoryNodeMapEntryModel> nodes, string title, HashSet<string> matchedIds) {
            for (int i = 0; i < nodes.Count; i += 1) {
                StoryNodeMapEntryModel node = nodes[i];
                if (node.Status == ConflictStatus || matchedIds.Contains(node.Id)) {
                    continue;
                }

                if (node.Title == title) {
                    return node;
                }
            }

            return null;
        }

        static StoryNodeMapEntryModel? FindRenameCandidate(List<StoryNodeMapEntryModel> nodes,
                                                           StoryNodeMapNodeSnapshot snapshot,
                                                           HashSet<string> matchedIds) {
            StoryNodeMapEntryModel? bestCandidate = null;
            int bestScore = 0;
            bool hasTie = false;

            for (int i = 0; i < nodes.Count; i += 1) {
                StoryNodeMapEntryModel candidate = nodes[i];
                if (candidate.Status == ConflictStatus || matchedIds.Contains(candidate.Id)) {
                    continue;
                }

                int score = EvaluateRenameCandidate(candidate, snapshot);
                if (score <= 0) {
                    continue;
                }

                if (score > bestScore) {
                    bestCandidate = candidate;
                    bestScore = score;
                    hasTie = false;
                    continue;
                }

                if (score == bestScore) {
                    hasTie = true;
                }
            }

            if (hasTie) {
                return null;
            }

            return bestCandidate;
        }

        static int EvaluateRenameCandidate(StoryNodeMapEntryModel candidate, StoryNodeMapNodeSnapshot snapshot) {
            if (string.IsNullOrWhiteSpace(candidate.SourcePath)
                || !string.Equals(candidate.SourcePath, snapshot.SourcePath, System.StringComparison.Ordinal)) {
                return 0;
            }

            bool fingerprintMatches = !string.IsNullOrWhiteSpace(candidate.FirstContentFingerprint)
                && candidate.FirstContentFingerprint == snapshot.FirstContentFingerprint;
            bool neighborMatches = !string.IsNullOrWhiteSpace(candidate.NeighborFingerprint)
                && candidate.NeighborFingerprint == snapshot.NeighborFingerprint;
            int anchorOverlap = CountAnchorOverlap(candidate.LineAnchorSamples, snapshot.LineAnchorSamples);
            if (!fingerprintMatches && !neighborMatches && anchorOverlap == 0) {
                return 0;
            }

            int score = 10;
            if (fingerprintMatches) {
                score += 8;
            }

            if (neighborMatches) {
                score += 4;
            }

            score += Math.Min(anchorOverlap, 3) * 2;

            int lineDistance = Math.Abs(candidate.SourceLine - snapshot.SourceLine);
            if (lineDistance <= 3) {
                score += 3;
            } else if (lineDistance <= 10) {
                score += 2;
            } else if (lineDistance <= 30) {
                score += 1;
            }

            return score;
        }

        static int CountAnchorOverlap(List<string> left, List<string> right) {
            if (left.Count == 0 || right.Count == 0) {
                return 0;
            }

            HashSet<string> set = new HashSet<string>(left, System.StringComparer.Ordinal);
            int overlap = 0;
            for (int i = 0; i < right.Count; i += 1) {
                if (set.Contains(right[i])) {
                    overlap += 1;
                }
            }

            return overlap;
        }

        static void AddPreviousTitleIfRenamed(StoryNodeMapEntryModel entry, string newTitle) {
            string oldTitle = entry.Title;
            if (string.IsNullOrWhiteSpace(oldTitle) || oldTitle == newTitle) {
                return;
            }

            for (int i = 0; i < entry.PreviousTitles.Count; i += 1) {
                if (entry.PreviousTitles[i] == oldTitle) {
                    return;
                }
            }

            entry.PreviousTitles.Add(oldTitle);
        }

        static StoryNodeMapEntryModel CreateNewEntry(string timestamp) {
            return new StoryNodeMapEntryModel {
                Id = "node_" + Guid.CreateVersion7().ToString("N").ToUpperInvariant(),
                Status = ActiveStatus,
                CreatedAt = timestamp,
                UpdatedAt = timestamp,
            };
        }

        static StoryNodeMapEntryModel Clone(StoryNodeMapEntryModel source) {
            return new StoryNodeMapEntryModel {
                Id = source.Id ?? string.Empty,
                Title = source.Title ?? string.Empty,
                PreviousTitles = new List<string>(source.PreviousTitles ?? new List<string>()),
                SourcePath = source.SourcePath ?? string.Empty,
                SourceLine = source.SourceLine,
                SourceCharacter = source.SourceCharacter,
                FirstContentFingerprint = source.FirstContentFingerprint ?? string.Empty,
                NeighborFingerprint = source.NeighborFingerprint ?? string.Empty,
                LineAnchorSamples = new List<string>(source.LineAnchorSamples ?? new List<string>()),
                Status = source.Status ?? string.Empty,
                CreatedAt = source.CreatedAt ?? string.Empty,
                UpdatedAt = source.UpdatedAt ?? string.Empty,
            };
        }

        static StoryNodeMapModel Clone(StoryNodeMapModel source) {
            StoryNodeMapModel copy = new StoryNodeMapModel {
                Format = source.Format ?? "inscape.node-map",
                FormatVersion = source.FormatVersion == 0 ? 1 : source.FormatVersion,
            };

            for (int i = 0; i < source.Nodes.Count; i += 1) {
                copy.Nodes.Add(Clone(source.Nodes[i]));
            }

            for (int i = 0; i < source.Tombstones.Count; i += 1) {
                StoryNodeMapTombstoneModel tombstone = source.Tombstones[i];
                copy.Tombstones.Add(new StoryNodeMapTombstoneModel {
                    Id = tombstone.Id ?? string.Empty,
                    LastTitle = tombstone.LastTitle ?? string.Empty,
                    LastSourcePath = tombstone.LastSourcePath ?? string.Empty,
                    DeletedAt = tombstone.DeletedAt ?? string.Empty,
                });
            }

            return copy;
        }

        static string NormalizeSourcePath(string rootPath, string sourcePath) {
            if (string.IsNullOrWhiteSpace(sourcePath)) {
                return string.Empty;
            }

            if (!Path.IsPathRooted(sourcePath)) {
                return sourcePath.Replace('\\', '/');
            }

            string fullRootPath = Path.GetFullPath(rootPath);
            string fullSourcePath = Path.GetFullPath(sourcePath);
            if (!fullSourcePath.StartsWith(fullRootPath, System.StringComparison.OrdinalIgnoreCase)) {
                return sourcePath.Replace('\\', '/');
            }

            return Path.GetRelativePath(fullRootPath, fullSourcePath).Replace('\\', '/');
        }

        static string BuildFirstContentFingerprint(StoryGraphNodeModel node) {
            List<string> fragments = new List<string>();

            for (int lineIndex = 0; lineIndex < node.Lines.Count && fragments.Count < 4; lineIndex += 1) {
                DslScriptLineModel line = node.Lines[lineIndex];
                if (line.Kind == DslScriptLineKindModel.Metadata || string.IsNullOrWhiteSpace(line.Text)) {
                    continue;
                }

                fragments.Add("line|" + line.Kind + "|" + line.Speaker + "|" + line.Text);
            }

            for (int choiceIndex = 0; choiceIndex < node.Choices.Count && fragments.Count < 4; choiceIndex += 1) {
                DslScriptChoiceGroupModel choice = node.Choices[choiceIndex];
                if (!string.IsNullOrWhiteSpace(choice.Prompt)) {
                    fragments.Add("prompt|" + choice.Prompt);
                }

                for (int optionIndex = 0; optionIndex < choice.Options.Count && fragments.Count < 4; optionIndex += 1) {
                    DslScriptChoiceOptionModel option = choice.Options[optionIndex];
                    if (!string.IsNullOrWhiteSpace(option.Text)) {
                        fragments.Add("option|" + option.Text + "|" + option.Target);
                    }
                }
            }

            if (fragments.Count == 0) {
                return string.Empty;
            }

            return "sha256:" + ComputeSha256Hex(string.Join("\n", fragments));
        }

        static string BuildNeighborFingerprint(List<StoryGraphNodeModel> nodes, int nodeIndex) {
            string previous = nodeIndex > 0 ? nodes[nodeIndex - 1].Name : string.Empty;
            string current = nodes[nodeIndex].Name;
            string next = nodeIndex + 1 < nodes.Count ? nodes[nodeIndex + 1].Name : string.Empty;
            return "sha256:" + ComputeSha256Hex("previous=" + previous + "\ncurrent=" + current + "\nnext=" + next);
        }

        static List<string> CollectLineAnchorSamples(StoryGraphNodeModel node) {
            List<string> anchors = new List<string>();

            for (int lineIndex = 0; lineIndex < node.Lines.Count && anchors.Count < 5; lineIndex += 1) {
                string anchor = node.Lines[lineIndex].Anchor;
                if (!string.IsNullOrWhiteSpace(anchor)) {
                    anchors.Add(anchor);
                }
            }

            for (int choiceIndex = 0; choiceIndex < node.Choices.Count && anchors.Count < 5; choiceIndex += 1) {
                DslScriptChoiceGroupModel choice = node.Choices[choiceIndex];
                if (!string.IsNullOrWhiteSpace(choice.Anchor)) {
                    anchors.Add(choice.Anchor);
                }

                for (int optionIndex = 0; optionIndex < choice.Options.Count && anchors.Count < 5; optionIndex += 1) {
                    string anchor = choice.Options[optionIndex].Anchor;
                    if (!string.IsNullOrWhiteSpace(anchor)) {
                        anchors.Add(anchor);
                    }
                }
            }

            return anchors;
        }

        static string ComputeSha256Hex(string input) {
            byte[] bytes = Encoding.UTF8.GetBytes(input.Normalize(NormalizationForm.FormC));
            byte[] hash = SHA256.HashData(bytes);
            StringBuilder builder = new StringBuilder(hash.Length * 2);
            for (int i = 0; i < hash.Length; i += 1) {
                builder.Append(hash[i].ToString("x2", System.Globalization.CultureInfo.InvariantCulture));
            }
            return builder.ToString();
        }

        static int CompareNodes(StoryNodeMapEntryModel left, StoryNodeMapEntryModel right) {
            int titleComparison = string.Compare(left.Title, right.Title, System.StringComparison.Ordinal);
            if (titleComparison != 0) {
                return titleComparison;
            }

            return string.Compare(left.Id, right.Id, System.StringComparison.Ordinal);
        }

        static int CompareTombstones(StoryNodeMapTombstoneModel left, StoryNodeMapTombstoneModel right) {
            int titleComparison = string.Compare(left.LastTitle, right.LastTitle, System.StringComparison.Ordinal);
            if (titleComparison != 0) {
                return titleComparison;
            }

            return string.Compare(left.Id, right.Id, System.StringComparison.Ordinal);
        }

        sealed class StoryNodeMapNodeSnapshot {

            public string Title { get; set; } = string.Empty;

            public string SourcePath { get; set; } = string.Empty;

            public int SourceLine { get; set; }

            public int SourceCharacter { get; set; }

            public string FirstContentFingerprint { get; set; } = string.Empty;

            public string NeighborFingerprint { get; set; } = string.Empty;

            public List<string> LineAnchorSamples { get; set; } = new List<string>();

        }

    }

}
