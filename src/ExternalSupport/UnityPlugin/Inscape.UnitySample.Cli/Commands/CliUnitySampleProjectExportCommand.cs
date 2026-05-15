using System.Text;
using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.UnitySample.Cli {

    static class CliUnitySampleProjectExportCommand {

        internal static int Run(StoryGraphCompilationResultModel result,
                                string[] args,
                                ToolConfigModel config,
                                string? outputPath,
                                JsonSerializerOptions jsonOptions) {
            if (string.IsNullOrWhiteSpace(outputPath)) {
                Console.Error.WriteLine("Missing required option: -o <output-directory>");
                return 1;
            }

            UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
            if (!TryReadExportOptions(args, config, out UnitySampleExportOptions options)) {
                return 1;
            }

            UnitySampleExportResult export = exporter.Export(result, options);
            WriteExportFiles(outputPath, export, jsonOptions);
            UnitySampleCli.PrintDiagnostics(result.Diagnostics);
            return result.HasErrors ? 1 : 0;
        }

        static bool TryReadExportOptions(string[] args, ToolConfigModel config, out UnitySampleExportOptions options) {
            options = new UnitySampleExportOptions {
                TalkingIdStart = ReadIntOption(args, "--unity-sample-talking-start", config.UnitySample.TalkingIdStart ?? 100000),
            };

            string? roleMapPath = UnitySampleCli.ReadOption(args, "--unity-sample-role-map") ?? config.UnitySample.RoleMap;
            if (!RoleMapReaderDomain.TryRead(roleMapPath,
                                             out Dictionary<string, int> roleIdsBySpeaker,
                                             out string? roleMapError)) {
                Console.Error.WriteLine(roleMapError);
                return false;
            }

            foreach (KeyValuePair<string, int> pair in roleIdsBySpeaker) {
                options.RoleIdsBySpeaker[pair.Key] = pair.Value;
            }

            string? bindingMapPath = UnitySampleCli.ReadOption(args, "--unity-sample-binding-map") ?? config.UnitySample.BindingMap;
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!HostBindingMapReaderDomain.TryRead(bindingMapPath,
                                                        out List<HostBindingMapEntryModel> bindingEntries,
                                                        out string? bindingError)) {
                    Console.Error.WriteLine(bindingError);
                    return false;
                }

                for (int i = 0; i < bindingEntries.Count; i += 1) {
                    HostBindingMapEntryModel entry = bindingEntries[i];
                    options.HostBindings.Add(new UnitySampleHostBinding {
                        Kind = entry.Kind,
                        Alias = entry.Alias,
                        UnitySampleId = entry.TargetId,
                        UnityGuid = entry.UnityGuid,
                        AddressableKey = entry.AddressableKey,
                        AssetPath = entry.AssetPath,
                    });
                }
            }

            string? talkingRoot = UnitySampleCli.ReadOption(args, "--unity-sample-existing-talking-root") ?? config.UnitySample.ExistingTalkingRoot;
            if (!TalkingIdReservationScanDomain.TryRead(talkingRoot,
                                                        out HashSet<int> reservedTalkingIds,
                                                        out string? talkingError)) {
                Console.Error.WriteLine(talkingError);
                return false;
            }

            foreach (int talkingId in reservedTalkingIds) {
                options.ReservedTalkingIds.Add(talkingId);
            }

            return true;
        }

        static int ReadIntOption(string[] args, string optionName, int fallback) {
            string? value = UnitySampleCli.ReadOption(args, optionName);
            if (string.IsNullOrWhiteSpace(value)) {
                return fallback;
            }

            if (int.TryParse(value, out int parsed)) {
                return parsed;
            }

            return fallback;
        }

        static void WriteExportFiles(string outputDirectory, UnitySampleExportResult export, JsonSerializerOptions jsonOptions) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, jsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-unity-sample-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

    }

}
