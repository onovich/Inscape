using System.Text;
using System.Text.Json;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Tooling;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void LocalizationAlignmentAuditReportsReviewStatuses() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
@entry
Narrator: Same line.
Narrator: I waited here a while.
Narrator: Removed line.
Narrator: Shared line A.
Narrator: Shared line B.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T11:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string sameAnchor = AnchorForText(oldCsv, "Same line.");
            string changedAnchor = AnchorForText(oldCsv, "I waited here a while.");
            string removedAnchor = AnchorForText(oldCsv, "Removed line.");
            string sharedFirstAnchor = AnchorForText(oldCsv, "Shared line A.");
            string sharedSecondAnchor = AnchorForText(oldCsv, "Shared line B.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + sameAnchor + ",intro,Dialogue,Narrator,Same line.,Same translation,story/court.inscape,3,1\n"
                + changedAnchor + ",intro,Dialogue,Narrator,I waited here a while.,Changed candidate translation,story/court.inscape,4,1\n"
                + removedAnchor + ",intro,Dialogue,Narrator,Removed line.,Removed translation,story/court.inscape,5,1\n"
                + sharedFirstAnchor + ",intro,Dialogue,Narrator,Shared line A.,Shared first translation,story/court.inscape,6,1\n"
                + sharedSecondAnchor + ",intro,Dialogue,Narrator,Shared line B.,Shared second translation,story/court.inscape,7,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
@entry
Narrator: Same line.
Narrator: I waited here a while longer.
Narrator: Brand new line.
Narrator: Shared line C.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            AssertEqual(1, report.Summary.KeptCount, "Alignment kept count");
            AssertEqual(1, report.Summary.NewCount, "Alignment new count");
            AssertEqual(1, report.Summary.ChangedCount, "Alignment changed count");
            AssertEqual(1, report.Summary.RemovedCount, "Alignment removed count");
            AssertEqual(1, report.Summary.ConflictCount, "Alignment conflict count");
            AssertEqual(3, report.Summary.StaleCount, "Alignment stale count");
            AssertEqual("Same translation", FindAlignmentItem(report, "kept").Translation, "Kept item should carry confirmed translation.");
            AssertEqual("", FindAlignmentItem(report, "changed").Translation, "Changed item should not silently inherit candidate translation.");
            AssertEqual("Changed candidate translation", FindAlignmentItem(report, "changed").Candidates[0].Translation, "Changed item should expose candidate translation.");
            AssertTrue(FindAlignmentItem(report, "changed").Candidates[0].Reason.Contains("same-stable-node", StringComparison.Ordinal), "Changed candidate should explain why it was suggested.");
            AssertEqual(2, FindAlignmentItem(report, "conflict").Candidates.Count, "Conflict item should expose multiple candidates.");
            LocalizationReviewActionPresenterModel diffAction = report.Presenter.Items
                .First(item => item.Item.Status == "changed")
                .Actions
                .First(action => action.ActionKey == "show-candidate-diff");
            AssertTrue(diffAction.Detail.Contains("current: I waited here a while longer.", StringComparison.Ordinal), "Review presenter should expose current text in candidate diff action.");
            AssertTrue(diffAction.Detail.Contains("previous: I waited here a while.", StringComparison.Ordinal), "Review presenter should expose previous candidate text in candidate diff action.");
            AssertTrue(diffAction.Detail.Contains("translation: Changed candidate translation", StringComparison.Ordinal), "Review presenter should expose candidate translation in diff action.");
            AssertTrue(diffAction.Detail.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in diff action.");
            LocalizationReviewActionPresenterModel candidateAction = report.Presenter.Items
                .First(item => item.Item.Status == "changed")
                .Actions
                .First(action => action.ActionKey == "open-candidate");
            AssertTrue(candidateAction.ActionStatus.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in action status.");
            AssertTrue(candidateAction.Detail.Contains("rankPenalty ", StringComparison.Ordinal), "Review presenter should expose candidate rank penalty in candidate detail.");
            AssertTrue(candidateAction.Signals.Any(signal => signal.Key == "similarity" && signal.Value.Length > 0), "Review presenter should expose structured candidate similarity signal.");
            AssertTrue(candidateAction.Signals.Any(signal => signal.Key == "rank-penalty" && signal.Value.Length > 0), "Review presenter should expose structured rank penalty signal.");
            AssertTrue(candidateAction.Signals.Any(signal => signal.Key == "reason" && signal.Value.Contains("same-stable-node", StringComparison.Ordinal)), "Review presenter should expose structured candidate reason signal.");
        }


        static void LocalizationReviewPresenterSummarizesAdditionalCandidates() {
            LocalizationAlignmentItemModel item = new LocalizationAlignmentItemModel {
                Status = "conflict",
                Review = "manual",
                NodeTitle = "intro",
                Text = "Current text.",
                SourcePath = "story/court.inscape",
                Line = 2,
                Column = 1,
            };
            item.Candidates.Add(new LocalizationAlignmentCandidateModel {
                Text = "Candidate A.",
                Translation = "Translation A",
                Similarity = 0.8,
                RankPenalty = 1,
            });
            item.Candidates.Add(new LocalizationAlignmentCandidateModel {
                Text = "Candidate B.",
                Translation = "Translation B",
                Similarity = 0.7,
                RankPenalty = 2,
            });
            item.Candidates.Add(new LocalizationAlignmentCandidateModel {
                Text = "Candidate C.",
                Translation = "Translation C",
                Similarity = 0.6,
                RankPenalty = 3,
            });

            LocalizationReviewItemPresenterModel presenterItem = LocalizationReviewPresenterModelBuilderDomain.BuildItem(item, path => path);

            AssertTrue(presenterItem.Title.Contains("(3 candidates)", StringComparison.Ordinal), "Review item title should expose plural candidate count.");
            AssertTrue(presenterItem.Detail.Contains("Candidate A.", StringComparison.Ordinal), "Review item summary should include the first candidate.");
            AssertTrue(presenterItem.Detail.Contains("Candidate B.", StringComparison.Ordinal), "Review item summary should include the second candidate.");
            AssertTrue(presenterItem.Detail.Contains("+1 more", StringComparison.Ordinal), "Review item summary should expose omitted candidate count.");
            AssertFalse(presenterItem.Detail.Contains("Candidate C.", StringComparison.Ordinal), "Review item summary should keep longer candidate lists compact.");
            AssertTrue(presenterItem.Signals.Any(signal => signal.Key == "review-status" && signal.Severity == "risk"), "Conflict review item should expose structured risk signal.");
            AssertTrue(presenterItem.Signals.Any(signal => signal.Key == "candidate-count" && signal.Value == "3"), "Review item should expose structured candidate count signal.");

            LocalizationAlignmentItemModel singleCandidateItem = new LocalizationAlignmentItemModel {
                Status = "changed",
                Review = "review",
                NodeTitle = "intro",
                Text = "Current text.",
            };
            singleCandidateItem.Candidates.Add(new LocalizationAlignmentCandidateModel {
                Text = "Only candidate.",
                Translation = "Only translation",
                RankPenalty = 0,
            });

            LocalizationReviewItemPresenterModel singleCandidatePresenterItem = LocalizationReviewPresenterModelBuilderDomain.BuildItem(singleCandidateItem, path => path);

            AssertTrue(singleCandidatePresenterItem.Title.Contains("(1 candidate)", StringComparison.Ordinal), "Review item title should expose singular candidate count.");
            AssertFalse(singleCandidatePresenterItem.Title.Contains("(1 candidates)", StringComparison.Ordinal), "Review item title should avoid plural label for one candidate.");
        }


        static void LocalizationAlignmentAuditKeepsLowConfidenceSimilarTextAsConflict() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The lantern still burns tonight.
Narrator: The lantern still shines tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T12:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string firstAnchor = AnchorForText(oldCsv, "The lantern still burns tonight.");
            string secondAnchor = AnchorForText(oldCsv, "The lantern still shines tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + firstAnchor + ",intro,Dialogue,Narrator,The lantern still burns tonight.,Lantern A,story/court.inscape,2,1\n"
                + secondAnchor + ",intro,Dialogue,Narrator,The lantern still shines tonight.,Lantern B,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The lantern still watches tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel conflict = FindAlignmentItem(report, "conflict");
            AssertEqual(0, report.Summary.ChangedCount, "Low-confidence similarity should not produce changed status.");
            AssertEqual(1, report.Summary.ConflictCount, "Low-confidence similarity should produce conflict.");
            AssertEqual(2, conflict.Candidates.Count, "Conflict should keep multiple review candidates.");
            AssertEqual("", conflict.Translation, "Conflict should not fill confirmed translation.");
            LocalizationReviewItemPresenterModel conflictReview = report.Presenter.Items.First(item => item.Item.Status == "conflict");
            AssertTrue(conflictReview.Detail.Contains("<lineIdentity missing>", StringComparison.Ordinal), "Review presenter should expose missing line identity status when no sidecar is available.");
        }


        static void LocalizationAlignmentAuditPrefersNearSequenceWhenSimilarityTies() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha route old.
Narrator: Shared branch line.
Narrator: Filler line.
Narrator: Shared branch line.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T13:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string firstSharedAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string secondSharedAnchor = LastAnchorForText(oldCsv, "Shared branch line.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + firstSharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Near translation,story/court.inscape,3,1\n"
                + secondSharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Far translation,story/court.inscape,5,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Alpha route old.
Narrator: Shared branch line extended.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel conflict = FindAlignmentItem(report, "conflict");
            AssertEqual("Near translation", conflict.Candidates[0].Translation, "Conflict candidates should prefer the nearer sequence match when similarity ties.");
            AssertTrue(conflict.Candidates.Count > 1, "Near sequence tie should keep alternate candidates for review.");
            AssertTrue(conflict.Candidates[0].RankPenalty <= conflict.Candidates[1].RankPenalty, "Preferred candidate should expose a rank penalty that is no worse than later candidates.");
        }


        static void LocalizationAlignmentAuditPrefersNearContextShapeWhenSequenceTies() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask witness about lantern tonight.
Narrator: Ask witness about old ledger records.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T14:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string lanternAnchor = AnchorForText(oldCsv, "Ask witness about lantern tonight.");
            string ledgerAnchor = AnchorForText(oldCsv, "Ask witness about old ledger records.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + lanternAnchor + ",intro,Dialogue,Narrator,Ask witness about lantern tonight.,Lantern context,story/court.inscape,2,1\n"
                + ledgerAnchor + ",intro,Dialogue,Narrator,Ask witness about old ledger records.,Ledger context,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask witness about window tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Lantern context", chosen.Candidates[0].Translation, "Chosen candidate should prefer the nearer context shape when sequence is tied.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-context-shape", StringComparison.Ordinal), "Preferred candidate should record context-shape reason.");
        }


        static void LocalizationAlignmentAuditPrefersKeywordFingerprintWhenContextIsClose() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Review captain incident records tonight.
Narrator: Review witness lantern rumors tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T15:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string recordsAnchor = AnchorForText(oldCsv, "Review captain incident records tonight.");
            string rumorsAnchor = AnchorForText(oldCsv, "Review witness lantern rumors tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + recordsAnchor + ",intro,Dialogue,Narrator,Review captain incident records tonight.,Records context,story/court.inscape,2,1\n"
                + rumorsAnchor + ",intro,Dialogue,Narrator,Review witness lantern rumors tonight.,Rumors context,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Review captain records tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Records context", chosen.Candidates[0].Translation, "Chosen candidate should prefer the closer keyword fingerprint when context shape is similar.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-keyword-fingerprint", StringComparison.Ordinal) || chosen.Candidates[0].Reason.Contains("near-keyword-fingerprint", StringComparison.Ordinal), "Preferred candidate should record keyword fingerprint reason.");
        }


        static void LocalizationAlignmentAuditPrefersNeighborShapeWhenFingerprintIsClose() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Return captain ledger tonight.
Narrator: Return witness ledger tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string captainAnchor = AnchorForText(oldCsv, "Return captain ledger tonight.");
            string witnessAnchor = AnchorForText(oldCsv, "Return witness ledger tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + captainAnchor + ",intro,Dialogue,Narrator,Return captain ledger tonight.,Captain ledger,story/court.inscape,2,1\n"
                + witnessAnchor + ",intro,Dialogue,Narrator,Return witness ledger tonight.,Witness ledger,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Return captain notes tonight.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Captain ledger", chosen.Candidates[0].Translation, "Chosen candidate should prefer the closer neighbor shape when keyword fingerprints are both close.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-neighbor-shape", StringComparison.Ordinal) || chosen.Candidates[0].Reason.Contains("near-neighbor-shape", StringComparison.Ordinal), "Preferred candidate should record neighbor-shape reason.");
        }


        static void LocalizationAlignmentAuditPrefersMatchingLocalContext() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Court context begins.
Narrator: Shared branch line.
Narrator: Court context ends.
Narrator: Archive context begins.
Narrator: Shared branch line.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:30:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string courtBeginAnchor = AnchorForText(oldCsv, "Court context begins.");
            string courtAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string courtEndAnchor = AnchorForText(oldCsv, "Court context ends.");
            string archiveBeginAnchor = AnchorForText(oldCsv, "Archive context begins.");
            string archiveAnchor = LastAnchorForText(oldCsv, "Shared branch line.");
            string archiveEndAnchor = AnchorForText(oldCsv, "Archive context ends.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + courtBeginAnchor + ",intro,Dialogue,Narrator,Court context begins.,Court begin translation,story/court.inscape,2,1\n"
                + courtAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Court translation,story/court.inscape,3,1\n"
                + courtEndAnchor + ",intro,Dialogue,Narrator,Court context ends.,Court end translation,story/court.inscape,4,1\n"
                + archiveBeginAnchor + ",intro,Dialogue,Narrator,Archive context begins.,Archive begin translation,story/court.inscape,5,1\n"
                + archiveAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Archive translation,story/court.inscape,6,1\n"
                + archiveEndAnchor + ",intro,Dialogue,Narrator,Archive context ends.,Archive end translation,story/court.inscape,7,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context begins.
Narrator: Shared branch line extended.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindFirstAlignmentItem(report, "changed", "conflict");
            AssertEqual("Archive translation", chosen.Candidates[0].Translation, "Chosen candidate should prefer the matching surrounding localization context.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("same-local-context", StringComparison.Ordinal), "Preferred candidate should record local context reason.");
        }


        static void LocalizationAlignmentAuditRecordsNearLocalContext() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context begins.
Narrator: Shared branch line.
Narrator: Archive context ends.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T16:45:00Z", System.Globalization.CultureInfo.InvariantCulture));
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string beginAnchor = AnchorForText(oldCsv, "Archive context begins.");
            string sharedAnchor = AnchorForText(oldCsv, "Shared branch line.");
            string endAnchor = AnchorForText(oldCsv, "Archive context ends.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + beginAnchor + ",intro,Dialogue,Narrator,Archive context begins.,Archive begin translation,story/court.inscape,2,1\n"
                + sharedAnchor + ",intro,Dialogue,Narrator,Shared branch line.,Shared translation,story/court.inscape,3,1\n"
                + endAnchor + ",intro,Dialogue,Narrator,Archive context ends.,Archive end translation,story/court.inscape,4,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Archive context opens.
Narrator: Shared branch line extended.
Narrator: Archive context closes.
"""),
            }, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape");

            LocalizationAlignmentItemModel chosen = FindAlignmentItemByText(report, "Shared branch line extended.", "changed", "conflict");
            AssertEqual("Shared translation", chosen.Candidates[0].Translation, "Chosen candidate should keep using surrounding context when neighboring lines are lightly rewritten.");
            AssertTrue(chosen.Candidates[0].Reason.Contains("near-local-context", StringComparison.Ordinal), "Preferred candidate should record near local context reason.");
        }


        static void LocalizationAlignmentAuditUsesLineSidecarIdentity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: Ask clerk about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:00:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string guardAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string clerkAnchor = AnchorForText(oldCsv, "Ask clerk about lantern tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + guardAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard translation,story/court.inscape,2,1\n"
                + clerkAnchor + ",intro,Dialogue,Narrator,Ask clerk about lantern tonight.,Clerk translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about records tonight.
Narrator: Ask clerk about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual("Guard translation", changed.Candidates[0].Translation, "Line sidecar identity should keep the changed line paired with its previous translation candidate.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Preferred candidate should record line identity reason.");
            AssertEqual(changed.LineId, changed.Candidates[0].LineId, "Current item and preferred candidate should share the same line id.");
            AssertTrue(!string.IsNullOrWhiteSpace(changed.LineFingerprint), "Current item should expose line fingerprint for review.");
            AssertTrue(!string.IsNullOrWhiteSpace(changed.Candidates[0].LineFingerprint), "Candidate item should expose line fingerprint for review.");
            LocalizationReviewItemPresenterModel reviewItem = report.Presenter.Items.First(item => item.Item.Status == "changed");
            AssertTrue(reviewItem.Signals.Any(signal => signal.Key == "current-line-identity" && signal.Value.Contains(changed.LineId, StringComparison.Ordinal)), "Review presenter should expose current line identity as a structured item signal.");
            AssertTrue(reviewItem.Detail.Contains("<line " + changed.LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose current line identity status in item detail.");
            AssertTrue(reviewItem.Detail.Contains("fp " + changed.LineFingerprint.Substring(0, Math.Min(changed.LineFingerprint.Length, 12)), StringComparison.Ordinal), "Review presenter should expose current line fingerprint in item detail.");
            LocalizationReviewActionPresenterModel candidateAction = reviewItem.Actions.First(action => action.ActionKey == "open-candidate");
            AssertTrue(candidateAction.Signals.Any(signal => signal.Key == "candidate-line-identity" && signal.Value.Contains(changed.Candidates[0].LineId, StringComparison.Ordinal)), "Review presenter should expose candidate line identity as a structured action signal.");
            AssertTrue(candidateAction.ActionStatus.Contains("line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose candidate line identity status in action status.");
            AssertTrue(candidateAction.Detail.Contains("<line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter should expose candidate line identity status in action detail.");
            AssertTrue(candidateAction.Detail.Contains("fp " + changed.Candidates[0].LineFingerprint.Substring(0, Math.Min(changed.Candidates[0].LineFingerprint.Length, 12)), StringComparison.Ordinal), "Review presenter should expose candidate line fingerprint in action detail.");
            LocalizationReviewActionPresenterModel diffAction = reviewItem.Actions.First(action => action.ActionKey == "show-candidate-diff");
            AssertTrue(diffAction.Signals.Any(signal => signal.Key == "current-line-identity" && signal.Value.Contains(changed.LineId, StringComparison.Ordinal)), "Review presenter should expose current line identity as a structured diff signal.");
            AssertTrue(diffAction.Signals.Any(signal => signal.Key == "candidate-line-identity" && signal.Value.Contains(changed.Candidates[0].LineId, StringComparison.Ordinal)), "Review presenter should expose candidate line identity as a structured diff signal.");
            AssertTrue(diffAction.Summary.Contains("<line " + changed.LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff summary should expose current line identity status.");
            AssertTrue(diffAction.Summary.Contains("<line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff summary should expose candidate line identity status.");
            AssertTrue(diffAction.Detail.Contains("<line " + changed.LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff should expose current line identity status.");
            AssertTrue(diffAction.Detail.Contains("<line " + changed.Candidates[0].LineId + " available fp ", StringComparison.Ordinal), "Review presenter diff should expose candidate line identity status.");
        }


        static void LocalizationAlignmentAuditResolvesCloseCandidatesByLineIdentity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: Ask guard about lantern tonight!
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:15:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string stableAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string closeAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight!");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + stableAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Stable line translation,story/court.inscape,2,1\n"
                + closeAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight!,Close text translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight?
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual(1, changed.Candidates.Count, "Exact line identity should prune close text-only candidates from the changed item.");
            AssertEqual("Stable line translation", changed.Candidates[0].Translation, "Exact line identity should resolve close text candidates to the stable line.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Resolved candidate should record exact line identity reason.");
        }


        static void LocalizationAlignmentAuditKeepsRewrittenSameLineCandidate() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:30:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string anchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + anchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Guard lantern translation,story/court.inscape,2,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The verdict changes everything.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual("", changed.Translation, "Rewritten line should still require review instead of inheriting the translation.");
            AssertEqual("Guard lantern translation", changed.Candidates[0].Translation, "Exact line identity should keep the previous translation as a review candidate even when text similarity is low.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Rewritten same-line candidate should record exact line identity reason.");
        }


        static void LocalizationAlignmentAuditRanksExactLineIdentityBeforeTextSimilarity() {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel initial = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: Ask guard about lantern tonight.
Narrator: The verdict changes tomorrow.
"""),
            }, "D:/LabProjects/Inscape");
            StoryNodeMapModel nodeMap = StoryNodeMapUpdateDomain.Update(new StoryNodeMapModel(),
                                                                        initial,
                                                                        "D:/LabProjects/Inscape",
                                                                        DateTimeOffset.Parse("2026-05-19T17:45:00Z", System.Globalization.CultureInfo.InvariantCulture));
            LocalizationLineRefreshResultModel firstRefresh = LocalizationLineMapRefreshDomain.Refresh(new LocalizationLineMapModel(), initial, "D:/LabProjects/Inscape");
            string oldCsv = LocalizationCsvFlowDomain.Extract(initial.Graph);
            string lineAnchor = AnchorForText(oldCsv, "Ask guard about lantern tonight.");
            string similarAnchor = AnchorForText(oldCsv, "The verdict changes tomorrow.");
            string oldCsvWithTranslations = "anchor,node,kind,speaker,text,translation,sourcePath,line,column\n"
                + lineAnchor + ",intro,Dialogue,Narrator,Ask guard about lantern tonight.,Exact line translation,story/court.inscape,2,1\n"
                + similarAnchor + ",intro,Dialogue,Narrator,The verdict changes tomorrow.,Similar text translation,story/court.inscape,3,1\n";

            StoryGraphCompilationResultModel updated = compiler.Compile(new List<DslScriptSourceModel> {
                new DslScriptSourceModel("D:/LabProjects/Inscape/story/court.inscape", """
# intro
Narrator: The verdict changes everything.
"""),
            }, "D:/LabProjects/Inscape");
            LocalizationLineRefreshResultModel refreshed = LocalizationLineMapRefreshDomain.Refresh(firstRefresh.LineMap, updated, "D:/LabProjects/Inscape");

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(updated,
                                                                                             new Inscape.Compiler.Localization.LocalizationCsvReaderDomain().Read(oldCsvWithTranslations),
                                                                                             nodeMap,
                                                                                             "D:/LabProjects/Inscape",
                                                                                             new LocalizationAlignmentLineIdentityInputModel {
                                                                                                 Status = "available",
                                                                                                 LineMap = refreshed.LineMap,
                                                                                             });

            LocalizationAlignmentItemModel changed = FindAlignmentItem(report, "changed");
            AssertEqual(1, changed.Candidates.Count, "Exact line identity should prune higher-similarity text-only candidates.");
            AssertEqual("Exact line translation", changed.Candidates[0].Translation, "Exact line identity should rank before a higher text-similarity candidate from another line.");
            AssertTrue(changed.Candidates[0].Reason.Contains("same-line-id", StringComparison.Ordinal), "Preferred candidate should record exact line identity reason.");
        }

    }
}
