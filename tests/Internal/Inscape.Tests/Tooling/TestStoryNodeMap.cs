using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void StoryNodeMapUpdatePreservesIdsAndMarksMissingNodes() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 法庭开场
@entry
旁白：开场。

# 作废节点
旁白：旧节点。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel created = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T00:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            StoryNodeMapEntryModel intro = FindNode(created, "法庭开场");
            StoryNodeMapEntryModel removed = FindNode(created, "作废节点");

            StoryGraphCompilationResultModel updatedProject = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 法庭开场
@entry
旁白：开场。
旁白：继续。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel updated = StoryNodeMapUpdateDomain.Update(created,
                                                                        updatedProject,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T01:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            StoryNodeMapEntryModel updatedIntro = FindNode(updated, "法庭开场");
            StoryNodeMapEntryModel missingNode = FindNode(updated, "作废节点");

            AssertEqual(intro.Id, updatedIntro.Id, "Stable node id should be preserved for same title.");
            AssertEqual("active", updatedIntro.Status, "Existing node should stay active.");
            AssertEqual("story/court.inscape", updatedIntro.SourcePath, "Updated node source path");
            AssertTrue(updatedIntro.LineAnchorSamples.Count > 0, "Updated node should keep line anchor samples.");
            AssertEqual(removed.Id, missingNode.Id, "Missing node should preserve original id.");
            AssertEqual("missing", missingNode.Status, "Removed node should become missing.");
        }

        static void StoryNodeMapUpdateMarksDuplicateIdsAsConflict() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 法庭开场
@entry
旁白：开场。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel existing = new StoryNodeMapModel {
                Nodes = new List<StoryNodeMapEntryModel> {
                    new StoryNodeMapEntryModel {
                        Id = "node_DUPLICATE",
                        Title = "旧标题甲",
                        Status = "active",
                        CreatedAt = "2026-05-18T00:00:00Z",
                        UpdatedAt = "2026-05-18T00:00:00Z",
                    },
                    new StoryNodeMapEntryModel {
                        Id = "node_DUPLICATE",
                        Title = "旧标题乙",
                        Status = "active",
                        CreatedAt = "2026-05-18T00:00:00Z",
                        UpdatedAt = "2026-05-18T00:00:00Z",
                    },
                },
            };

            StoryNodeMapModel updated = StoryNodeMapUpdateDomain.Update(existing,
                                                                        result,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T02:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            int conflictCount = 0;
            for (int i = 0; i < updated.Nodes.Count; i += 1) {
                if (updated.Nodes[i].Status == "conflict") {
                    conflictCount += 1;
                }
            }

            AssertEqual(2, conflictCount, "Duplicate ids should be preserved as conflict entries.");
            AssertTrue(FindNode(updated, "法庭开场").Id.StartsWith("node_", StringComparison.Ordinal), "Fresh node should still be created.");
        }

        static void StoryNodeMapUpdateDetectsUnambiguousRenames() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 法庭开场
@entry
旁白：第一句。
旁白：第二句。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel created = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T03:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            StoryNodeMapEntryModel beforeRename = FindNode(created, "法庭开场");

            StoryGraphCompilationResultModel renamed = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 庭审序幕
@entry
旁白：第一句。
旁白：第二句。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel updated = StoryNodeMapUpdateDomain.Update(created,
                                                                        renamed,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T04:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            StoryNodeMapEntryModel renamedEntry = FindNode(updated, "庭审序幕");

            AssertEqual(beforeRename.Id, renamedEntry.Id, "Rename should preserve stable id.");
            AssertTrue(renamedEntry.PreviousTitles.Contains("法庭开场"), "Rename should append previous title.");
            AssertEqual("active", renamedEntry.Status, "Renamed node should stay active.");
            AssertFalse(ContainsNode(updated, "法庭开场"), "Old title should not remain as a separate missing entry after rename.");
        }

        static void StoryNodeMapUpdateSkipsAmbiguousRenameMatches() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 节点甲
旁白：重复台词。

# 节点乙
旁白：重复台词。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel created = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T05:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            StoryGraphCompilationResultModel renamed = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# 全新标题
旁白：重复台词。

# 节点乙
旁白：重复台词。
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel updated = StoryNodeMapUpdateDomain.Update(created,
                                                                        renamed,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T06:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            StoryNodeMapEntryModel newEntry = FindNode(updated, "全新标题");
            StoryNodeMapEntryModel oldEntry = FindNode(updated, "节点甲");
            StoryNodeMapEntryModel unchangedEntry = FindNode(updated, "节点乙");

            AssertTrue(newEntry.Id.StartsWith("node_", StringComparison.Ordinal), "Ambiguous rename should create a fresh stable id.");
            AssertEqual("missing", oldEntry.Status, "Ambiguous old node should stay missing until manual confirmation.");
            AssertEqual("active", unchangedEntry.Status, "Unchanged node should stay active.");
            AssertFalse(newEntry.PreviousTitles.Contains("节点甲"), "Ambiguous rename should not silently claim previous titles.");
        }

        static StoryNodeMapEntryModel FindNode(StoryNodeMapModel map, string title) {
            for (int i = 0; i < map.Nodes.Count; i += 1) {
                if (map.Nodes[i].Title == title) {
                    return map.Nodes[i];
                }
            }

            throw new InvalidOperationException("Could not find node map entry: " + title);
        }

        static bool ContainsNode(StoryNodeMapModel map, string title) {
            for (int i = 0; i < map.Nodes.Count; i += 1) {
                if (map.Nodes[i].Title == title) {
                    return true;
                }
            }

            return false;
        }

        static void StoryNodeMapUpdateReportIncludesManualReviewCandidates() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# node.a
Narrator: Same line.
# node.b
Narrator: Same line.
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel created = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T07:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            StoryGraphCompilationResultModel renamed = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# node.renamed
Narrator: Same line.
# node.b
Narrator: Same line.
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapUpdateResultModel update = StoryNodeMapUpdateDomain.UpdateWithReport(created,
                                                                                              renamed,
                                                                                              "D:/LabProjects/Inscape",
                                                                                              DateTimeOffset.Parse("2026-05-19T08:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            StoryNodeMapUpdateReportItemModel reviewItem = FindReportItem(update.Report, "manual-review", "node.renamed");
            AssertEqual(1, update.Report.Summary.ManualReviewCount, "Report should count manual review items.");
            AssertEqual(2, reviewItem.Candidates.Count, "Manual review item should list tied rename candidates.");
            AssertEqual("node.a", reviewItem.Candidates[0].Title, "Manual review should keep the first candidate title.");
            AssertEqual("node.b", reviewItem.Candidates[1].Title, "Manual review should keep the second candidate title.");
        }

        static void StoryNodeMapUpdateReportIncludesRenamedItems() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: First line.
Narrator: Second line.
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapModel created = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T09:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            StoryGraphCompilationResultModel renamed = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# courtroom.intro
Narrator: First line.
Narrator: Second line.
"""),
            }, "D:/LabProjects/Inscape");

            StoryNodeMapUpdateResultModel update = StoryNodeMapUpdateDomain.UpdateWithReport(created,
                                                                                              renamed,
                                                                                              "D:/LabProjects/Inscape",
                                                                                              DateTimeOffset.Parse("2026-05-19T10:00:00Z", System.Globalization.CultureInfo.InvariantCulture));

            StoryNodeMapUpdateReportItemModel renamedItem = FindReportItem(update.Report, "renamed", "courtroom.intro");
            AssertEqual(1, update.Report.Summary.RenamedNodeCount, "Report should count renamed items.");
            AssertEqual("intro", renamedItem.PreviousTitle, "Renamed report item should include previous title.");
        }

        static void StoryNodeMapReviewActionAppliesCandidateStableId() {
            StoryNodeMapModel nodeMap = new StoryNodeMapModel {
                Nodes = new List<StoryNodeMapEntryModel> {
                    new StoryNodeMapEntryModel {
                        Id = "node_CURRENT",
                        Title = "庭审序幕",
                        SourcePath = "story/court.inscape",
                        SourceLine = 1,
                        Status = "active",
                        CreatedAt = "2026-05-19T01:00:00Z",
                        UpdatedAt = "2026-05-19T02:00:00Z",
                    },
                    new StoryNodeMapEntryModel {
                        Id = "node_OLD",
                        Title = "法庭开场",
                        PreviousTitles = new List<string> {
                            "court_intro",
                        },
                        SourcePath = "story/court.inscape",
                        SourceLine = 1,
                        Status = "missing",
                        CreatedAt = "2026-05-18T01:00:00Z",
                        UpdatedAt = "2026-05-18T02:00:00Z",
                    },
                },
            };

            bool applied = StoryNodeMapReviewActionDomain.TryApplyCandidateStableId(nodeMap,
                                                                                    "node_CURRENT",
                                                                                    "庭审序幕",
                                                                                    "node_OLD",
                                                                                    out StoryNodeMapReviewCandidateApplyResultModel result,
                                                                                    out string? errorMessage);

            AssertTrue(applied, errorMessage ?? "Candidate should apply.");
            AssertEqual("node_OLD", result.AppliedStableId, "Applied result stable id");
            AssertEqual("node_CURRENT", result.RemovedStableId, "Applied result removed temporary id");
            AssertEqual(1, result.NodeMap.Nodes.Count, "Candidate duplicate entry should be removed.");

            StoryNodeMapEntryModel updated = FindNode(result.NodeMap, "庭审序幕");
            AssertEqual("node_OLD", updated.Id, "Current title should reuse candidate stable id.");
            AssertTrue(updated.PreviousTitles.Contains("court_intro"), "Candidate previous titles should be preserved.");
            AssertTrue(updated.PreviousTitles.Contains("法庭开场"), "Candidate title should become a previous title.");
            AssertEqual("2026-05-18T01:00:00Z", updated.CreatedAt, "Current title should inherit candidate createdAt.");
            AssertEqual("active", updated.Status, "Current node status should stay active.");
            AssertEqual("story/court.inscape", updated.SourcePath, "Current source path should stay on the current title.");
        }

        static void StoryNodeMapReviewActionRejectsMissingEntries() {
            StoryNodeMapModel nodeMap = new StoryNodeMapModel {
                Nodes = new List<StoryNodeMapEntryModel> {
                    new StoryNodeMapEntryModel {
                        Id = "node_CURRENT",
                        Title = "庭审序幕",
                        Status = "active",
                    },
                },
            };

            bool missingCandidateApplied = StoryNodeMapReviewActionDomain.TryApplyCandidateStableId(nodeMap,
                                                                                                    "node_CURRENT",
                                                                                                    "庭审序幕",
                                                                                                    "node_MISSING",
                                                                                                    out _,
                                                                                                    out string? missingCandidateError);
            bool missingCurrentApplied = StoryNodeMapReviewActionDomain.TryApplyCandidateStableId(nodeMap,
                                                                                                  "node_MISSING",
                                                                                                  "庭审序幕",
                                                                                                  "node_CURRENT",
                                                                                                  out _,
                                                                                                  out string? missingCurrentError);

            AssertFalse(missingCandidateApplied, "Missing candidate should be rejected.");
            AssertTrue((missingCandidateError ?? "").Contains("candidate", StringComparison.OrdinalIgnoreCase), "Missing candidate error should explain the candidate.");
            AssertFalse(missingCurrentApplied, "Missing current entry should be rejected.");
            AssertTrue((missingCurrentError ?? "").Contains("current", StringComparison.OrdinalIgnoreCase), "Missing current error should explain the current entry.");
            AssertEqual("node_CURRENT", FindNode(nodeMap, "庭审序幕").Id, "Rejected apply should not mutate the input map.");
        }

        static StoryNodeMapUpdateReportItemModel FindReportItem(StoryNodeMapUpdateReportModel report, string kind, string title) {
            for (int i = 0; i < report.Items.Count; i += 1) {
                StoryNodeMapUpdateReportItemModel item = report.Items[i];
                if (item.Kind == kind && item.Title == title) {
                    return item;
                }
            }

            throw new InvalidOperationException("Could not find report item: " + kind + " / " + title);
        }

    }
}
