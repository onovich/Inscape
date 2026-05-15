using System;
using System.Collections.Generic;

namespace Inscape.Tests {

    public static partial class TestCore {

        public static int Main() {
            List<(string Name, Action Body)> tests = new List<(string Name, Action Body)> {
                ("parse graph with loop", ParseGraphWithLoop),
                ("diagnose missing target", DiagnoseMissingTarget),
                ("diagnose invalid node names", DiagnoseInvalidNodeNames),
                ("hashes are stable", HashesAreStable),
                ("hash ignores file path", HashIgnoresFilePath),
                ("hash ignores line movement", HashIgnoresLineMovement),
                ("hash distinguishes duplicate text", HashDistinguishesDuplicateText),
                ("anchor validator detects collisions", StoryGraphAnchorValidatorDetectsCollisions),
                ("cli diagnose emits json", CliDiagnoseEmitsJson),
                ("cli commands lists command reference", CliCommandsListsCommandReference),
                ("cli help emits command details", CliHelpEmitsCommandDetails),
                ("cli export-host-schema-template emits json", CliExportHostSchemaTemplateEmitsJson),
                ("project compiler resolves cross-file targets", StoryGraphCompilerDomainResolvesCrossFileTargets),
                ("project compiler diagnoses duplicate nodes", StoryGraphCompilerDomainDiagnosesDuplicateNodes),
                ("cli diagnose-project applies override", CliDiagnoseProjectAppliesOverride),
                ("cli compile-project emits project ir", CliCompileProjectEmitsProjectIr),
                ("project compiler uses entry metadata", StoryGraphCompilerDomainUsesEntryMetadata),
                ("project compiler applies entry override", StoryGraphCompilerDomainAppliesEntryOverride),
                ("project compiler diagnoses missing entry override", StoryGraphCompilerDomainDiagnosesMissingEntryOverride),
                ("project compiler diagnoses multiple entries", StoryGraphCompilerDomainDiagnosesMultipleEntries),
                ("project compiler reports fallback entry", StoryGraphCompilerDomainReportsFallbackEntry),
                ("cli preview-project emits html", CliPreviewProjectEmitsHtml),
                ("cli preview-project applies entry override", CliPreviewProjectAppliesEntryOverride),
                ("cli extract-l10n emits csv", CliExtractL10nEmitsCsv),
                ("cli extract-l10n-project emits csv", CliExtractL10nProjectEmitsCsv),
                ("cli update-l10n preserves translations", CliUpdateL10nPreservesTranslations),
                ("cli update-l10n-project preserves translations", CliUpdateL10nProjectPreservesTranslations),
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
