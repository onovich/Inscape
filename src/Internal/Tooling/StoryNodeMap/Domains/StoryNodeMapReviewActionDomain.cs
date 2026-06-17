namespace Inscape.Tooling {

    public static class StoryNodeMapReviewActionDomain {

        public static bool TryApplyCandidateStableId(StoryNodeMapModel nodeMap,
                                                     string currentStableId,
                                                     string currentTitle,
                                                     string candidateStableId,
                                                     out StoryNodeMapReviewCandidateApplyResultModel result,
                                                     out string? errorMessage) {
            return TryApplyCandidateStableId(nodeMap,
                                             currentStableId,
                                             currentTitle,
                                             candidateStableId,
                                             null,
                                             out result,
                                             out errorMessage);
        }

        public static bool TryApplyCandidateStableId(StoryNodeMapModel nodeMap,
                                                     string currentStableId,
                                                     string currentTitle,
                                                     string candidateStableId,
                                                     StoryNodeMapReviewCandidateApplyRequestModel? request,
                                                     out StoryNodeMapReviewCandidateApplyResultModel result,
                                                     out string? errorMessage) {
            result = new StoryNodeMapReviewCandidateApplyResultModel();
            errorMessage = null;

            StoryNodeMapModel copy = Clone(nodeMap);
            List<StoryNodeMapEntryModel> nodes = copy.Nodes;
            int currentIndex = FindCurrentNodeIndex(nodes, currentStableId, currentTitle);
            int candidateIndex = FindNodeIndexById(nodes, candidateStableId);

            if (currentIndex < 0) {
                errorMessage = "Could not find current node map entry '" + currentTitle + "' with stable id '" + currentStableId + "'.";
                return false;
            }

            if (candidateIndex < 0) {
                errorMessage = "Could not find candidate stable node id '" + candidateStableId + "' in the node map.";
                return false;
            }

            StoryNodeMapEntryModel currentNode = nodes[currentIndex];
            StoryNodeMapEntryModel candidateNode = nodes[candidateIndex];
            List<string> previousTitles = new List<string>(candidateNode.PreviousTitles);
            if (!string.IsNullOrWhiteSpace(candidateNode.Title)
                && candidateNode.Title != currentNode.Title
                && !previousTitles.Contains(candidateNode.Title, StringComparer.Ordinal)) {
                previousTitles.Add(candidateNode.Title);
            }

            string removedStableId = currentNode.Id;
            StoryNodeMapCandidateApplyPreviewModel changePreview = BuildChangePreview(currentNode,
                                                                                      candidateNode,
                                                                                      previousTitles,
                                                                                      candidateIndex != currentIndex);
            currentNode.Id = candidateNode.Id;
            currentNode.PreviousTitles = previousTitles;
            if (!string.IsNullOrWhiteSpace(candidateNode.CreatedAt)) {
                currentNode.CreatedAt = candidateNode.CreatedAt;
            }

            if (candidateIndex != currentIndex) {
                nodes.RemoveAt(candidateIndex);
            }

            nodes.Sort(CompareNodes);
            copy.Tombstones.Sort(CompareTombstones);
            copy.Format = "inscape.node-map";
            copy.FormatVersion = 1;

            result = new StoryNodeMapReviewCandidateApplyResultModel {
                ChangePreview = changePreview,
                NodeMap = copy,
                AppliedStableId = currentNode.Id,
                RemovedStableId = removedStableId,
                Title = currentNode.Title,
            };
            PopulateWriteMetadata(result, request);
            return true;
        }

        static StoryNodeMapCandidateApplyPreviewModel BuildChangePreview(StoryNodeMapEntryModel currentNode,
                                                                         StoryNodeMapEntryModel candidateNode,
                                                                         List<string> previousTitles,
                                                                         bool removesCandidateEntry) {
            return new StoryNodeMapCandidateApplyPreviewModel {
                AppliedStableId = candidateNode.Id,
                CandidateStableId = candidateNode.Id,
                CandidateTitle = candidateNode.Title,
                CurrentStableId = currentNode.Id,
                CurrentTitle = currentNode.Title,
                PreviousTitlesAfterApply = new List<string>(previousTitles),
                RemovedStableId = currentNode.Id,
                RemovesCandidateEntry = removesCandidateEntry,
                ResultTitle = currentNode.Title,
            };
        }

        static void PopulateWriteMetadata(StoryNodeMapReviewCandidateApplyResultModel result, StoryNodeMapReviewCandidateApplyRequestModel? request) {
            if (request == null) {
                result.Backup = new StoryNodeMapReviewBackupMetadataModel {
                    Required = false,
                    Status = "not-requested",
                };
                result.RecoveryHint = "This shared action updated an in-memory node map only. Use a workspace write-back backup before replacing the sidecar.";
                return;
            }

            string nodeMapPath = request.NodeMapPath ?? string.Empty;
            string outputPath = string.IsNullOrWhiteSpace(request.OutputPath) ? nodeMapPath : request.OutputPath;
            bool dryRun = request.DryRun;
            result.DryRun = dryRun;
            result.WritesNodeMap = !dryRun;
            result.NodeMapPath = nodeMapPath;
            result.OutputPath = outputPath;
            result.Backup = new StoryNodeMapReviewBackupMetadataModel {
                Required = !dryRun,
                SourcePath = nodeMapPath,
                Status = dryRun ? "not-required-dry-run" : "required-before-write-back",
            };
            result.RecoveryHint = dryRun
                ? "Dry-run writes a preview node map only. The original sidecar is unchanged; discard the preview to recover."
                : "Before replacing the node map sidecar, keep a workspace write-back backup under .inscape-workspace/backups. Restore that backup to recover the previous stable id assignment.";
        }

        static int FindCurrentNodeIndex(List<StoryNodeMapEntryModel> nodes, string stableId, string title) {
            for (int i = 0; i < nodes.Count; i += 1) {
                StoryNodeMapEntryModel node = nodes[i];
                if (node.Id == stableId && node.Title == title) {
                    return i;
                }
            }

            return -1;
        }

        static int FindNodeIndexById(List<StoryNodeMapEntryModel> nodes, string stableId) {
            for (int i = 0; i < nodes.Count; i += 1) {
                if (nodes[i].Id == stableId) {
                    return i;
                }
            }

            return -1;
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

        static int CompareNodes(StoryNodeMapEntryModel left, StoryNodeMapEntryModel right) {
            int titleComparison = string.Compare(left.Title, right.Title, StringComparison.Ordinal);
            if (titleComparison != 0) {
                return titleComparison;
            }

            return string.Compare(left.Id, right.Id, StringComparison.Ordinal);
        }

        static int CompareTombstones(StoryNodeMapTombstoneModel left, StoryNodeMapTombstoneModel right) {
            int titleComparison = string.Compare(left.LastTitle, right.LastTitle, StringComparison.Ordinal);
            if (titleComparison != 0) {
                return titleComparison;
            }

            return string.Compare(left.Id, right.Id, StringComparison.Ordinal);
        }

    }

}
