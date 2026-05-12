using System;
using System.Collections.Generic;

namespace Inscape.Tests {

    public static partial class TestCore {

        public static int Main() {
            List<(string Name, Action Body)> tests = new List<(string Name, Action Body)> {
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
