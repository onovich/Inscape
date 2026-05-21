using System;
using System.Collections.Generic;

namespace Inscape.Tests {

    public static partial class TestCore {

        public static int Main() {
            List<(string Name, Action Body)> tests = new List<(string Name, Action Body)> {
                ("parse graph with loop", ParseGraphWithLoop),
                ("diagnose missing target", DiagnoseMissingTarget),
                ("diagnose invalid node names", DiagnoseInvalidNodeNames),
                ("diagnose legacy node marker as content", DiagnoseLegacyNodeMarkerAsContent),
                ("parse hash title graph with Chinese jump", ParseHashTitleGraphWithChineseJump),
                ("diagnose duplicate hash titles", DiagnoseDuplicateHashTitles),
                ("warns when hash title missing leading blank line", WarnsWhenHashTitleMissingLeadingBlankLine),
                ("hashes are stable", HashesAreStable),
                ("hash ignores file path", HashIgnoresFilePath),
                ("hash ignores line movement", HashIgnoresLineMovement),
                ("hash distinguishes duplicate text", HashDistinguishesDuplicateText),
                ("anchor validator detects collisions", StoryGraphAnchorValidatorDetectsCollisions),
                ("source spans cover authoring elements", SourceSpansCoverAuthoringElements),
                ("project diagnostics preserve cross-file source", ProjectDiagnosticsPreserveCrossFileSource),
                ("language server diagnostics use editor coordinates", LanguageServerDiagnosticsUseEditorCoordinates),
                ("language server definitions use compiler source map", LanguageServerDefinitionsUseCompilerSourceMap),
                ("language server references and completions use compiler graph", LanguageServerReferencesAndCompletionsUseCompilerGraph),
                ("language server symbols and hover use compiler graph", LanguageServerSymbolsAndHoverUseCompilerGraph),
                ("language server entry probes emit stable json", LanguageServerEntryProbesEmitStableJson),
                ("language server project diagnostics apply override", LanguageServerProjectDiagnosticsApplyOverride),
                ("language server project navigation uses project graph and override", LanguageServerProjectNavigationUsesProjectGraphAndOverride),
                ("language server project completions use project graph and override", LanguageServerProjectCompletionsUseProjectGraphAndOverride),
                ("language server project hover uses project graph and override", LanguageServerProjectHoverUsesProjectGraphAndOverride),
                ("language server host schema capabilities use tooling contract", LanguageServerHostSchemaCapabilitiesUseToolingContract),
                ("language server stdio session serves project requests", LanguageServerStdioSessionServesProjectRequests),
                ("narrative runtime consumes compiler graph", NarrativeRuntimeConsumesCompilerGraph),
                ("tool config resolves host bridge path", ToolConfigResolvesHostBridgePath),
                ("tool config resolves node map path", ToolConfigResolvesNodeMapPath),
                ("host schema event reader reports schema events", HostSchemaEventReaderReportsSchemaEvents),
                ("query interpolation audit reports host schema hints", QueryInterpolationAuditReportsHostSchemaHints),
                ("story node map update preserves ids and marks missing nodes", StoryNodeMapUpdatePreservesIdsAndMarksMissingNodes),
                ("story node map update detects unambiguous renames", StoryNodeMapUpdateDetectsUnambiguousRenames),
                ("story node map update skips ambiguous rename matches", StoryNodeMapUpdateSkipsAmbiguousRenameMatches),
                ("story node map update marks duplicate ids as conflict", StoryNodeMapUpdateMarksDuplicateIdsAsConflict),
                ("story node map update report includes renamed items", StoryNodeMapUpdateReportIncludesRenamedItems),
                ("story node map update report includes manual review candidates", StoryNodeMapUpdateReportIncludesManualReviewCandidates),
                ("cli diagnose emits json", CliDiagnoseEmitsJson),
                ("cli commands lists command reference", CliCommandsListsCommandReference),
                ("cli help emits command details", CliHelpEmitsCommandDetails),
                ("cli audit-query-interpolation-project emits json", CliAuditQueryInterpolationProjectEmitsJson),
                ("cli inspect-host-schema-project emits json", CliInspectHostSchemaProjectEmitsJson),
                ("cli update-node-map-project writes stable node map", CliUpdateNodeMapProjectWritesStableNodeMap),
                ("cli update-node-map-project writes review report", CliUpdateNodeMapProjectWritesReviewReport),
                ("cli export-host-schema-template emits json", CliExportHostSchemaTemplateEmitsJson),
                ("project compiler resolves cross-file targets", StoryGraphCompilerDomainResolvesCrossFileTargets),
                ("project compiler diagnoses duplicate nodes", StoryGraphCompilerDomainDiagnosesDuplicateNodes),
                ("project compiler diagnoses duplicate hash titles", StoryGraphCompilerDomainDiagnosesDuplicateHashTitles),
                ("cli diagnose-project applies override", CliDiagnoseProjectAppliesOverride),
                ("cli compile-project emits project ir", CliCompileProjectEmitsProjectIr),
                ("project compiler uses entry metadata", StoryGraphCompilerDomainUsesEntryMetadata),
                ("project compiler applies entry override", StoryGraphCompilerDomainAppliesEntryOverride),
                ("project compiler diagnoses missing entry override", StoryGraphCompilerDomainDiagnosesMissingEntryOverride),
                ("project compiler diagnoses multiple entries", StoryGraphCompilerDomainDiagnosesMultipleEntries),
                ("project compiler reports fallback entry", StoryGraphCompilerDomainReportsFallbackEntry),
                ("cli preview-project emits html", CliPreviewProjectEmitsHtml),
                ("cli preview-project applies entry override", CliPreviewProjectAppliesEntryOverride),
                ("preview html converts compiler source coordinates", PreviewHtmlConvertsCompilerSourceCoordinates),
                ("preview html styles query interpolation tokens", PreviewHtmlStylesQueryInterpolationTokens),
                ("preview html provider adds csp to fallback pages", PreviewHtmlProviderAddsCspToFallbackPages),
                ("preview source controller keeps column fallback", PreviewSourceControllerKeepsColumnFallback),
                ("preview reveal bridge trims choice prefixes from link range", PreviewRevealBridgeTrimsChoicePrefixesFromLinkRange),
                ("cli extract-l10n emits csv", CliExtractL10nEmitsCsv),
                ("cli extract-l10n-project emits csv", CliExtractL10nProjectEmitsCsv),
                ("cli update-l10n preserves translations", CliUpdateL10nPreservesTranslations),
                ("cli update-l10n-project preserves translations", CliUpdateL10nProjectPreservesTranslations),
                ("localization alignment audit reports review statuses", LocalizationAlignmentAuditReportsReviewStatuses),
                ("localization alignment audit keeps low confidence similar text as conflict", LocalizationAlignmentAuditKeepsLowConfidenceSimilarTextAsConflict),
                ("localization alignment audit prefers near sequence when similarity ties", LocalizationAlignmentAuditPrefersNearSequenceWhenSimilarityTies),
                ("localization alignment audit prefers near context shape when sequence ties", LocalizationAlignmentAuditPrefersNearContextShapeWhenSequenceTies),
                ("localization alignment audit prefers keyword fingerprint when context is close", LocalizationAlignmentAuditPrefersKeywordFingerprintWhenContextIsClose),
                ("localization alignment audit prefers neighbor shape when fingerprint is close", LocalizationAlignmentAuditPrefersNeighborShapeWhenFingerprintIsClose),
                ("localization alignment audit uses line sidecar identity", LocalizationAlignmentAuditUsesLineSidecarIdentity),
                ("cli audit-l10n-alignment-project emits json", CliAuditL10nAlignmentProjectEmitsJson),
                ("cli audit-l10n-alignment-project emits text", CliAuditL10nAlignmentProjectEmitsText),
                ("cli audit-l10n-alignment-project reports line identity status", CliAuditL10nAlignmentProjectReportsLineIdentityStatus),
                ("cli audit-l10n-alignment-project reports line identity drift", CliAuditL10nAlignmentProjectReportsLineIdentityDrift),
                ("cli refresh localization line state emits refresh result json", CliRefreshLocalizationLineStateEmitsRefreshResultJson),
                ("localization line map refresh tracks changed added and removed lines", LocalizationLineMapRefreshTracksChangedAddedAndRemovedLines),
                ("tool config resolves localization line map path", ToolConfigResolvesLocalizationLineMapPath),
                ("localization line map writer creates backup and restores it", LocalizationLineMapWriterCreatesBackupAndRestoresIt),
                ("localization line map refresh stores source fingerprint", LocalizationLineMapRefreshStoresSourceFingerprint),
                ("localization line map refresh reports drift when fingerprint changed", LocalizationLineMapRefreshReportsDriftWhenFingerprintChanged),
                ("localization line map refresh treats inserted middle line as added", LocalizationLineMapRefreshTreatsInsertedMiddleLineAsAdded),
                ("localization line map refresh treats deleted middle line as removed", LocalizationLineMapRefreshTreatsDeletedMiddleLineAsRemoved),
                ("localization line map refresh keeps first line id when splitting line", LocalizationLineMapRefreshKeepsFirstLineIdWhenSplittingLine),
                ("localization line map refresh keeps first line id when merging lines", LocalizationLineMapRefreshKeepsFirstLineIdWhenMergingLines),
                ("localization line map refresh keeps stable ids for duplicate neighbor lines", LocalizationLineMapRefreshKeepsStableIdsForDuplicateNeighborLines),
                ("localization line map refresh treats complex replacement as add and remove", LocalizationLineMapRefreshTreatsComplexReplacementAsAddAndRemove),
                ("vscode localization command exposes review alignment entry", VSCodeLocalizationCommandExposesReviewAlignmentEntry),
            };

            int failed = 0;
            foreach ((string name, Action body) in tests) {
                try {
                    body();
                    Console.WriteLine("[pass] " + name);
                } catch (Exception ex) {
                    failed += 1;
                    Console.Error.WriteLine("[fail] " + name + ": " + ex.Message);
                }
            }

            return failed == 0 ? 0 : 1;
        }
    }
}
