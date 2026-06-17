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

        static void VSCodeLocalizationCommandExposesReviewAlignmentEntry() {
            string commandSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Commands/LocalizationCommand.js"));
            string reviewControllerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Controllers/LocalizationReviewController.js"));
            string toolingPresenterBuilderSource = File.ReadAllText(RepositoryFile("src/Internal/Tooling/Localization/Domains/LocalizationReviewPresenterModelBuilderDomain.cs"));
            string quickPickAdapterSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/ViewModels/LocalizationReviewQuickPickAdapter.js"));
            string toolsMenuSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/EditorAuthoring/Commands/EditorAuthoringCommand.js"));
            string nodeMapReviewControllerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/EditorAuthoring/Controllers/StoryNodeMapReviewController.js"));
            string extensionSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/ExtensionManifestEntry.js"));
            string registrationSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Entries/ExtensionRegistrationController.js"));
            string packageJson = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/package.json"));

            AssertTrue(commandSource.Contains("async reviewAlignment(context)"), "Localization command should expose reviewAlignment entrypoint.");
            AssertTrue(commandSource.Contains("audit-l10n-alignment-project"), "Localization command review should invoke alignment audit CLI.");
            AssertTrue(commandSource.Contains("--format"), "Localization command review should allow choosing output format.");
            AssertTrue(commandSource.Contains("this.localizationReviewController.reviewAlignmentReport(options.outputPath)"), "Localization command should delegate report review UI to a narrower controller.");
            AssertTrue(commandSource.Contains("async handleSuccessSelection(selection, options)"), "Localization command should isolate post-success selection dispatch from CLI invocation flow.");
            AssertTrue(commandSource.Contains("Review Items"), "Localization command should offer quick review action for json report.");
            AssertTrue(commandSource.Contains("Update CSV"), "Localization command should offer a CSV update action after alignment review.");
            AssertTrue(commandSource.Contains("async updateLocalizationFromReview(context, options)"), "Localization command should keep review-to-update glue in an explicit helper.");
            AssertTrue(commandSource.Contains("previousPath: options.previousPath"), "Localization review update action should reuse the already selected previous CSV.");
            AssertTrue(commandSource.Contains("commandName: \"update-l10n-project\""), "Localization review update action should invoke the shared update CLI.");
            AssertTrue(reviewControllerSource.Contains("async reviewAlignmentReport(reportPath)"), "Localization review controller should expose interactive report review entrypoint.");
            AssertTrue(reviewControllerSource.Contains("const presenter = this.buildPresenter(report);"), "Localization review controller should consume presenter model from report payload.");
            AssertTrue(reviewControllerSource.Contains("this.localizationReviewQuickPickAdapter.createQuickPickItems(presenter.Items)"), "Localization review controller should keep QuickPick adaptation local to VSCode UI.");
            AssertTrue(reviewControllerSource.Contains("this.localizationReviewQuickPickAdapter.createQuickPickItems(itemModel.Actions)"), "Localization review controller should adapt presenter actions through the QuickPick adapter.");
            AssertTrue(reviewControllerSource.Contains("show-candidate-diff"), "Localization review controller should expose presenter-provided candidate diff actions.");
            AssertFalse(reviewControllerSource.Contains("update-l10n-project"), "Localization review controller should not own CSV update command invocation.");
            AssertTrue(toolingPresenterBuilderSource.Contains("public static LocalizationReviewPresenterModel Build"), "Localization review presenter model builder should now live in Tooling.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"open-current\""), "Tooling presenter model builder should encode action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"open-candidate\""), "Tooling presenter model builder should encode candidate action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("ActionKey = \"show-candidate-diff\""), "Tooling presenter model builder should encode candidate diff action identity without VSCode-facing labels.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildRankPenaltySummary(candidate)"), "Tooling presenter model builder should expose rank penalty summaries for review UI.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildCandidateLineStatus(candidate)"), "Tooling presenter model builder should expose candidate line identity in action status.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildLineIdentitySummary(candidate.LineId, candidate.LineIdentityStatus, candidate.LineFingerprint)"), "Tooling presenter model builder should expose candidate line identity status summaries for review UI.");
            AssertTrue(toolingPresenterBuilderSource.Contains("BuildLineFingerprintSummary(fingerprint)"), "Tooling presenter model builder should expose line fingerprint summaries for review UI.");
            AssertTrue(quickPickAdapterSource.Contains("createQuickPickLabel(model)"), "QuickPick adapter should own VSCode-facing action label mapping.");
            AssertTrue(quickPickAdapterSource.Contains("createSignalSummary(model)"), "QuickPick adapter should consume shared presenter signals for review audit summaries.");
            AssertTrue(quickPickAdapterSource.Contains("Array.isArray(model.signals)"), "QuickPick adapter should read shared presenter signal arrays instead of parsing status text.");
            AssertTrue(quickPickAdapterSource.Contains("Compare candidate "), "QuickPick adapter should own VSCode-facing candidate diff labels.");
            AssertTrue(reviewControllerSource.Contains("openLocation(this.locationFromPayload(selected.location))"), "Localization review controller should jump to source location.");
            AssertTrue(extensionSource.Contains("new LocalizationReviewQuickPickAdapter()"), "Extension entry should assemble a separate QuickPick adapter for VSCode label mapping.");
            AssertTrue(extensionSource.Contains("const locationServices = {"), "Extension entry should centralize repeated location service injection.");
            AssertTrue(extensionSource.Contains("const openFileInEditor = async (filePath) => {"), "Extension entry should centralize repeated file-open glue.");
            AssertTrue(extensionSource.Contains("...locationServices"), "Extension entry should reuse grouped location services across controllers and commands.");
            AssertTrue(toolsMenuSource.Contains("审查本地化对齐候选"), "Tools menu should expose localization alignment review action.");
            AssertTrue(toolsMenuSource.Contains("await this.handleNodeMapSelection(selection, {"), "Editor authoring command should route node map success flow through a dedicated handler.");
            AssertTrue(toolsMenuSource.Contains("this.storyNodeMapReviewController"), "Editor authoring command should depend on a narrower node map review controller.");
            AssertTrue(toolsMenuSource.Contains("async handleNodeMapSelection(selection, options)"), "Editor authoring command should isolate node map success selection dispatch from invocation flow.");
            AssertTrue(toolsMenuSource.Contains("Review Items"), "Editor authoring command should expose review items action for node map report.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async reviewNodeMapReport(report, nodeMapPath, reportPath, workspaceFolder, context)"), "Story node map review controller should expose review entrypoint with workspace context.");
            AssertTrue(nodeMapReviewControllerSource.Contains("createNodeMapReviewActions(item, nodeMapPath, reportPath)"), "Story node map review controller should expose candidate-specific node map actions.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Apply candidate "), "Story node map review controller should expose explicit apply action for manual-review candidates.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Preview candidate "), "Story node map review controller should expose explicit dry-run preview for manual-review candidates.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async applyCandidateStableId(context, workspaceFolder, nodeMapPath, item, candidate)"), "Story node map review controller should support applying a reviewed stable id choice.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async previewCandidateStableId(context, workspaceFolder, nodeMapPath, item, candidate)"), "Story node map review controller should support dry-run preview for a reviewed stable id choice.");
            AssertTrue(nodeMapReviewControllerSource.Contains("this.applyCandidateStableIdToNodeMap({"), "Story node map review controller should delegate candidate apply to an injected shared action.");
            AssertFalse(nodeMapReviewControllerSource.Contains("applyCandidateStableIdToNodeMap(nodeMap, item, candidate)"), "Story node map review controller should not own node map mutation logic.");
            AssertTrue(toolsMenuSource.Contains("apply-node-map-candidate-project"), "Editor authoring command should invoke the shared node map candidate apply CLI.");
            AssertTrue(toolsMenuSource.Contains("async applyNodeMapReviewCandidate(options)"), "Editor authoring command should expose shared node map candidate apply glue.");
            AssertTrue(toolsMenuSource.Contains("async previewNodeMapReviewCandidate(options)"), "Editor authoring command should expose shared node map candidate dry-run glue.");
            AssertTrue(nodeMapReviewControllerSource.Contains("Revert last applied stable id"), "Story node map review controller should expose a revert action for the last applied stable id.");
            AssertTrue(nodeMapReviewControllerSource.Contains("async revertLastAppliedStableId(nodeMapPath)"), "Story node map review controller should support reverting the last applied stable id change.");
            AssertTrue(nodeMapReviewControllerSource.Contains("reviewBackupPath(nodeMapPath)"), "Story node map review controller should keep a review backup path helper for apply/revert flow.");
            AssertTrue(registrationSource.Contains("inscape.reviewLocalizationAlignment"), "Extension registration should register localization alignment review command.");
            AssertTrue(packageJson.Contains("\"command\": \"inscape.reviewLocalizationAlignment\""), "VSCode package should contribute localization alignment review command.");
            AssertTrue(packageJson.Contains("\"command\": \"inscape.refreshLocalizationLineState\""), "VSCode package should contribute localization line refresh command.");
            AssertTrue(packageJson.Contains("\"debug\""), "VSCode package should add debug source sync mode.");
            AssertTrue(commandSource.Contains("refresh-l10n-line-map-project"), "Localization command should invoke localization line refresh CLI command.");
            AssertTrue(commandSource.Contains("Show Summary"), "Localization command should expose a line refresh summary action.");
            AssertTrue(commandSource.Contains("async showLineRefreshSummary(reportPath)"), "Localization command should summarize line refresh changes for the user.");
            AssertTrue(commandSource.Contains("Show Details"), "Localization command should expose a detailed line refresh review action.");
            AssertTrue(commandSource.Contains("async showLineRefreshDetails(reportPath)"), "Localization command should expose detailed line refresh picks.");
            AssertTrue(commandSource.Contains("async openLineRefreshChange(selection, reportPath)"), "Localization command should support jumping from line refresh details to source.");
            AssertTrue(commandSource.Contains("handleLineMapDriftDecision(report, reportPath"), "Localization command should route drift detection through an explicit decision flow.");
            AssertTrue(commandSource.Contains("\"Continue\""), "Localization command should offer a continue action when line map drift is detected.");
            AssertTrue(commandSource.Contains("\"Restore Backup\""), "Localization command should offer restore backup action when line map drift is detected.");
            AssertTrue(commandSource.Contains("report.status.recommendation"), "Localization command should surface drift recommendations along with the warning.");
            AssertTrue(extensionSource.Contains("isDebugSourceSyncMode"), "Extension entry should expose debug source sync mode helper.");
            AssertTrue(extensionSource.Contains("new LocalizationLineMapDebugController({"), "Extension entry should assemble localization line map debug controller.");
            string hoverSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/DslScript/Providers/DslScriptHoverProvider.js"));
            string debugSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Localization/Controllers/LocalizationLineMapDebugController.js"));
            AssertTrue(debugSource.Contains("blockId:"), "Debug hover should expose blockId metadata from line sidecar.");
            AssertTrue(debugSource.Contains("lineId:"), "Debug hover should expose lineId metadata from line sidecar.");
            AssertTrue(debugSource.Contains("kind:"), "Debug hover should expose kind metadata from line sidecar.");
            AssertTrue(debugSource.Contains("speaker:"), "Debug hover should expose speaker metadata from line sidecar when present.");
            AssertTrue(debugSource.Contains("this.fs.promises.stat(lineMapPath)"), "Debug hover should stat the line sidecar before using cached data.");
            AssertTrue(debugSource.Contains("cached.mtimeMs === stat.mtimeMs"), "Debug hover line sidecar cache should invalidate when the sidecar mtime changes.");
            AssertTrue(debugSource.Contains("this.cache.delete(cacheKey)"), "Debug hover line sidecar cache should recover when a missing sidecar later appears.");
            AssertTrue(hoverSource.Contains("localizationLineMapDebugController.tryCreateHover(document, position)"), "DslScript hover provider should delegate debug hover to line sidecar controller.");
        }

    }
}
