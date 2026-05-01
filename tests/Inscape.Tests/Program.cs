using System;
using System.Collections.Generic;

namespace Inscape.Tests {

    public static partial class Program {

        public static int Main() {
            List<(string Name, Action Body)> tests = new List<(string Name, Action Body)> {
                ("parse graph with loop", ParseGraphWithLoop),
                ("diagnose missing target", DiagnoseMissingTarget),
                ("diagnose invalid node names", DiagnoseInvalidNodeNames),
                ("hashes are stable", HashesAreStable),
                ("hash ignores file path", HashIgnoresFilePath),
                ("hash ignores line movement", HashIgnoresLineMovement),
                ("hash distinguishes duplicate text", HashDistinguishesDuplicateText),
                ("anchor validator detects collisions", AnchorValidatorDetectsCollisions),
                ("cli diagnose emits json", CliDiagnoseEmitsJson),
                ("cli commands lists command reference", CliCommandsListsCommandReference),
                ("cli help emits command details", CliHelpEmitsCommandDetails),
                ("cli export-host-schema-template emits json", CliExportHostSchemaTemplateEmitsJson),
                ("project compiler resolves cross-file targets", ProjectCompilerResolvesCrossFileTargets),
                ("project compiler diagnoses duplicate nodes", ProjectCompilerDiagnosesDuplicateNodes),
                ("cli diagnose-project applies override", CliDiagnoseProjectAppliesOverride),
                ("cli compile-project emits project ir", CliCompileProjectEmitsProjectIr),
                ("project compiler uses entry metadata", ProjectCompilerUsesEntryMetadata),
                ("project compiler applies entry override", ProjectCompilerAppliesEntryOverride),
                ("project compiler diagnoses missing entry override", ProjectCompilerDiagnosesMissingEntryOverride),
                ("project compiler diagnoses multiple entries", ProjectCompilerDiagnosesMultipleEntries),
                ("project compiler reports fallback entry", ProjectCompilerReportsFallbackEntry),
                ("cli preview-project emits html", CliPreviewProjectEmitsHtml),
                ("cli preview-project applies entry override", CliPreviewProjectAppliesEntryOverride),
                ("cli extract-l10n emits csv", CliExtractL10nEmitsCsv),
                ("cli extract-l10n-project emits csv", CliExtractL10nProjectEmitsCsv),
                ("cli update-l10n preserves translations", CliUpdateL10nPreservesTranslations),
                ("cli update-l10n-project preserves translations", CliUpdateL10nProjectPreservesTranslations),
                ("cli export-unity-sample-binding-template emits csv", CliExportUnitySampleBindingTemplateEmitsCsv),
                ("cli export-unity-sample-role-template emits csv", CliExportUnitySampleRoleTemplateEmitsCsv),
                ("cli export-unity-sample-role-template fills existing role ids", CliExportUnitySampleRoleTemplateFillsExistingRoleIds),
                ("cli UnitySample commands read project config", CliUnitySampleCommandsReadProjectConfig),
                ("cli export-unity-sample-project emits manifest and csv", CliExportUnitySampleProjectEmitsManifestAndCsv),
                ("cli export-unity-sample-project reports unresolved host hooks", CliExportUnitySampleProjectReportsUnresolvedHostHooks),
                ("UnitySample timeline hooks support explicit phases", UnitySampleTimelineHooksSupportExplicitPhases),
                ("cli merge-unity-sample-l10n preserves and clears safely", CliMergeUnitySampleL10nPreservesAndClearsSafely),
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
