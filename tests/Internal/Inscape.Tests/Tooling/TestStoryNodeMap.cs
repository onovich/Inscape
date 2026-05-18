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

        static StoryNodeMapEntryModel FindNode(StoryNodeMapModel map, string title) {
            for (int i = 0; i < map.Nodes.Count; i += 1) {
                if (map.Nodes[i].Title == title) {
                    return map.Nodes[i];
                }
            }

            throw new InvalidOperationException("Could not find node map entry: " + title);
        }

    }
}
