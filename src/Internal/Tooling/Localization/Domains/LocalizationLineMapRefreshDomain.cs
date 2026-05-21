using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class LocalizationLineMapRefreshDomain {

        public static LocalizationLineRefreshResultModel Refresh(LocalizationLineMapModel existingMap,
                                                                 StoryGraphCompilationResultModel result,
                                                                 string rootPath) {
            LocalizationLineMapModel updatedMap = new LocalizationLineMapModel();
            LocalizationLineRefreshReportModel report = new LocalizationLineRefreshReportModel();
            Dictionary<string, LocalizationLineMapDocumentModel> existingDocuments = IndexDocuments(existingMap);
            List<LocalizationLineSnapshotModel> snapshots = BuildSnapshots(result, rootPath);

            Dictionary<string, List<LocalizationLineSnapshotModel>> snapshotsByPath = new Dictionary<string, List<LocalizationLineSnapshotModel>>(System.StringComparer.Ordinal);
            for (int i = 0; i < snapshots.Count; i += 1) {
                LocalizationLineSnapshotModel snapshot = snapshots[i];
                if (!snapshotsByPath.TryGetValue(snapshot.SourcePath, out List<LocalizationLineSnapshotModel>? list)) {
                    list = new List<LocalizationLineSnapshotModel>();
                    snapshotsByPath.Add(snapshot.SourcePath, list);
                }
                list.Add(snapshot);
            }

            foreach (KeyValuePair<string, List<LocalizationLineSnapshotModel>> pair in snapshotsByPath) {
                LocalizationLineMapDocumentModel updatedDocument = new LocalizationLineMapDocumentModel {
                    SourcePath = pair.Key,
                };

                LocalizationLineMapDocumentModel? existingDocument = existingDocuments.TryGetValue(pair.Key, out LocalizationLineMapDocumentModel? found)
                    ? found
                    : null;
                Dictionary<string, LocalizationLineMapBlockModel> existingBlocks = IndexBlocks(existingDocument);

                for (int i = 0; i < pair.Value.Count; i += 1) {
                    LocalizationLineSnapshotModel snapshot = pair.Value[i];
                    existingBlocks.TryGetValue(snapshot.BlockId, out LocalizationLineMapBlockModel? existingBlock);
                    LocalizationLineRefreshBlockModel blockReport = new LocalizationLineRefreshBlockModel {
                        BlockId = snapshot.BlockId,
                        SourcePath = snapshot.SourcePath,
                    };
                    LocalizationLineMapBlockModel updatedBlock = RefreshBlock(existingBlock, snapshot, blockReport);
                    updatedDocument.Blocks.Add(updatedBlock);
                    if (blockReport.Changes.Count > 0) {
                        report.Blocks.Add(blockReport);
                    }
                }

                updatedMap.Documents.Add(updatedDocument);
            }

            return new LocalizationLineRefreshResultModel {
                LineMap = updatedMap,
                Report = report,
            };
        }

        static LocalizationLineMapBlockModel RefreshBlock(LocalizationLineMapBlockModel? existingBlock,
                                                           LocalizationLineSnapshotModel snapshot,
                                                           LocalizationLineRefreshBlockModel blockReport) {
            LocalizationLineMapBlockModel updatedBlock = new LocalizationLineMapBlockModel {
                BlockId = snapshot.BlockId,
                BlockTitle = snapshot.BlockTitle,
            };

            List<LocalizationLineMapEntryModel> oldLines = existingBlock?.Lines ?? new List<LocalizationLineMapEntryModel>();
            int oldIndex = 0;
            int newIndex = 0;

            while (oldIndex < oldLines.Count || newIndex < snapshot.Lines.Count) {
                LocalizationLineMapEntryModel? oldLine = oldIndex < oldLines.Count ? oldLines[oldIndex] : null;
                LocalizationLineSnapshotEntryModel? newLine = newIndex < snapshot.Lines.Count ? snapshot.Lines[newIndex] : null;

                if (oldLine == null && newLine != null) {
                    updatedBlock.Lines.Add(CreateNewEntry(newLine, newIndex + 1));
                    blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                        Kind = "added",
                        LineId = updatedBlock.Lines[^1].LineId,
                        LineNumber = newIndex + 1,
                        NewText = newLine.Text,
                    });
                    newIndex += 1;
                    continue;
                }

                if (oldLine != null && newLine == null) {
                    blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                        Kind = "removed",
                        LineId = oldLine.LineId,
                        OldLineNumber = oldLine.LineNumber,
                        OldText = oldLine.Text,
                    });
                    oldIndex += 1;
                    continue;
                }

                if (oldLine == null || newLine == null) {
                    break;
                }

                if (IsSameShape(oldLine, newLine) && (oldLine.Fingerprint == newLine.Fingerprint || oldLine.Text == newLine.Text)) {
                    LocalizationLineMapEntryModel entry = UpdateEntry(oldLine, newLine, newIndex + 1);
                    updatedBlock.Lines.Add(entry);
                    oldIndex += 1;
                    newIndex += 1;
                    continue;
                }

                bool nextOldMatches = oldIndex + 1 < oldLines.Count && IsExactMatch(oldLines[oldIndex + 1], newLine);
                bool nextNewMatches = newIndex + 1 < snapshot.Lines.Count && IsExactMatch(oldLine, snapshot.Lines[newIndex + 1]);

                if (nextOldMatches && !nextNewMatches) {
                    blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                        Kind = "removed",
                        LineId = oldLine.LineId,
                        OldLineNumber = oldLine.LineNumber,
                        OldText = oldLine.Text,
                    });
                    oldIndex += 1;
                    continue;
                }

                if (nextNewMatches) {
                    LocalizationLineMapEntryModel entry = CreateNewEntry(newLine, newIndex + 1);
                    updatedBlock.Lines.Add(entry);
                    blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                        Kind = "added",
                        LineId = entry.LineId,
                        LineNumber = newIndex + 1,
                        NewText = newLine.Text,
                    });
                    newIndex += 1;
                    continue;
                }

                if (IsSameShape(oldLine, newLine)) {
                    LocalizationLineMapEntryModel changedEntry = UpdateEntry(oldLine, newLine, newIndex + 1);
                    updatedBlock.Lines.Add(changedEntry);
                    blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                        Kind = "changed",
                        LineId = changedEntry.LineId,
                        LineNumber = newIndex + 1,
                        OldLineNumber = oldLine.LineNumber,
                        OldText = oldLine.Text,
                        NewText = newLine.Text,
                    });
                    oldIndex += 1;
                    newIndex += 1;
                    continue;
                }

                LocalizationLineMapEntryModel addedFallback = CreateNewEntry(newLine, newIndex + 1);
                updatedBlock.Lines.Add(addedFallback);
                blockReport.Changes.Add(new LocalizationLineRefreshChangeModel {
                    Kind = "added",
                    LineId = addedFallback.LineId,
                    LineNumber = newIndex + 1,
                    NewText = newLine.Text,
                });
                newIndex += 1;
            }

            return updatedBlock;
        }

        static bool IsExactMatch(LocalizationLineMapEntryModel oldLine, LocalizationLineSnapshotEntryModel newLine) {
            return IsSameShape(oldLine, newLine)
                && (oldLine.Fingerprint == newLine.Fingerprint || oldLine.Text == newLine.Text);
        }

        static bool IsSameShape(LocalizationLineMapEntryModel oldLine, LocalizationLineSnapshotEntryModel newLine) {
            return oldLine.Kind == newLine.Kind && oldLine.Speaker == newLine.Speaker;
        }

        static LocalizationLineMapEntryModel UpdateEntry(LocalizationLineMapEntryModel oldLine,
                                                         LocalizationLineSnapshotEntryModel newLine,
                                                         int lineNumber) {
            return new LocalizationLineMapEntryModel {
                LineId = oldLine.LineId,
                LineNumber = lineNumber,
                Kind = newLine.Kind,
                Speaker = newLine.Speaker,
                Text = newLine.Text,
                Fingerprint = BuildFingerprint(newLine.Text),
            };
        }

        static LocalizationLineMapEntryModel CreateNewEntry(LocalizationLineSnapshotEntryModel newLine, int lineNumber) {
            return new LocalizationLineMapEntryModel {
                LineId = "line_" + Guid.CreateVersion7().ToString("N").ToUpperInvariant(),
                LineNumber = lineNumber,
                Kind = newLine.Kind,
                Speaker = newLine.Speaker,
                Text = newLine.Text,
                Fingerprint = BuildFingerprint(newLine.Text),
            };
        }

        static string BuildFingerprint(string text) {
            return string.Join(" ", (text ?? string.Empty).Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        static Dictionary<string, LocalizationLineMapDocumentModel> IndexDocuments(LocalizationLineMapModel map) {
            Dictionary<string, LocalizationLineMapDocumentModel> result = new Dictionary<string, LocalizationLineMapDocumentModel>(System.StringComparer.Ordinal);
            for (int i = 0; i < map.Documents.Count; i += 1) {
                LocalizationLineMapDocumentModel document = map.Documents[i];
                if (!result.ContainsKey(document.SourcePath)) {
                    result.Add(document.SourcePath, document);
                }
            }
            return result;
        }

        static Dictionary<string, LocalizationLineMapBlockModel> IndexBlocks(LocalizationLineMapDocumentModel? document) {
            Dictionary<string, LocalizationLineMapBlockModel> result = new Dictionary<string, LocalizationLineMapBlockModel>(System.StringComparer.Ordinal);
            if (document == null) {
                return result;
            }
            for (int i = 0; i < document.Blocks.Count; i += 1) {
                LocalizationLineMapBlockModel block = document.Blocks[i];
                if (!result.ContainsKey(block.BlockId)) {
                    result.Add(block.BlockId, block);
                }
            }
            return result;
        }

        static List<LocalizationLineSnapshotModel> BuildSnapshots(StoryGraphCompilationResultModel result, string rootPath) {
            List<LocalizationLineSnapshotModel> snapshots = new List<LocalizationLineSnapshotModel>();
            for (int documentIndex = 0; documentIndex < result.Documents.Count; documentIndex += 1) {
                DslScriptDocumentModel document = result.Documents[documentIndex];
                for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                    StoryGraphNodeModel node = document.Nodes[nodeIndex];
                    LocalizationLineSnapshotModel snapshot = new LocalizationLineSnapshotModel {
                        BlockId = node.Name,
                        BlockTitle = node.Name,
                        SourcePath = NormalizeSourcePath(rootPath, node.Source.SourcePath),
                    };
                    AddLines(snapshot, node.Lines);
                    AddChoices(snapshot, node.Choices);
                    snapshots.Add(snapshot);
                }
            }

            return snapshots;
        }

        static void AddLines(LocalizationLineSnapshotModel snapshot, List<DslScriptLineModel> lines) {
            for (int i = 0; i < lines.Count; i += 1) {
                DslScriptLineModel line = lines[i];
                if (line.Kind != DslScriptLineKindModel.Dialogue) {
                    continue;
                }
                snapshot.Lines.Add(new LocalizationLineSnapshotEntryModel {
                    Kind = "dialogue",
                    Speaker = line.Speaker,
                    Text = line.Text,
                    Fingerprint = BuildFingerprint(line.Text),
                });
            }
        }

        static void AddChoices(LocalizationLineSnapshotModel snapshot, List<DslScriptChoiceGroupModel> groups) {
            for (int i = 0; i < groups.Count; i += 1) {
                DslScriptChoiceGroupModel group = groups[i];
                if (!string.IsNullOrWhiteSpace(group.Prompt)) {
                    snapshot.Lines.Add(new LocalizationLineSnapshotEntryModel {
                        Kind = "choice-prompt",
                        Text = group.Prompt,
                        Fingerprint = BuildFingerprint(group.Prompt),
                    });
                }
                for (int optionIndex = 0; optionIndex < group.Options.Count; optionIndex += 1) {
                    DslScriptChoiceOptionModel option = group.Options[optionIndex];
                    snapshot.Lines.Add(new LocalizationLineSnapshotEntryModel {
                        Kind = "choice-option",
                        Text = option.Text,
                        Fingerprint = BuildFingerprint(option.Text),
                    });
                }
            }
        }

        static string NormalizeSourcePath(string rootPath, string sourcePath) {
            string full = Path.GetFullPath(sourcePath);
            string root = Path.GetFullPath(rootPath);
            if (!full.StartsWith(root, System.StringComparison.OrdinalIgnoreCase)) {
                return sourcePath.Replace('\\', '/');
            }
            return Path.GetRelativePath(root, full).Replace('\\', '/');
        }

        sealed class LocalizationLineSnapshotModel {

            public string BlockId { get; set; } = string.Empty;

            public string BlockTitle { get; set; } = string.Empty;

            public string SourcePath { get; set; } = string.Empty;

            public List<LocalizationLineSnapshotEntryModel> Lines { get; set; } = new List<LocalizationLineSnapshotEntryModel>();

        }

        sealed class LocalizationLineSnapshotEntryModel {

            public string Kind { get; set; } = string.Empty;

            public string Speaker { get; set; } = string.Empty;

            public string Text { get; set; } = string.Empty;

            public string Fingerprint { get; set; } = string.Empty;

        }

    }

}
