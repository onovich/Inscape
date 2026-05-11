using Inscape.Adapters.UnitySample;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleExportOptionsReader {

        internal static bool TryRead(string[] args, ToolConfigModel config, out UnitySampleExportOptions options) {
            options = new UnitySampleExportOptions {
                TalkingIdStart = ReadIntOption(args, "--unity-sample-talking-start", config.UnitySample.TalkingIdStart ?? 100000),
            };

            string? roleMapPath = CliCore.ReadOption(args, "--unity-sample-role-map") ?? config.UnitySample.RoleMap;
            if (!RoleMapReaderDomain.TryRead(roleMapPath,
                                             out Dictionary<string, int> roleIdsBySpeaker,
                                             out string? roleMapError)) {
                Console.Error.WriteLine(roleMapError);
                return false;
            }

            AddRoleIds(options, roleIdsBySpeaker);

            string? bindingMapPath = CliCore.ReadOption(args, "--unity-sample-binding-map") ?? config.UnitySample.BindingMap;
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!HostBindingMapReaderDomain.TryRead(bindingMapPath,
                                                        out List<HostBindingMapEntryModel> bindingEntries,
                                                        out string? bindingError)) {
                    Console.Error.WriteLine(bindingError);
                    return false;
                }

                AddBindingEntries(options, bindingEntries);
            }

            string? talkingRoot = CliCore.ReadOption(args, "--unity-sample-existing-talking-root") ?? config.UnitySample.ExistingTalkingRoot;
            if (!TalkingIdReservationScanDomain.TryRead(talkingRoot,
                                                        out HashSet<int> reservedTalkingIds,
                                                        out string? talkingError)) {
                Console.Error.WriteLine(talkingError);
                return false;
            }

            AddReservedTalkingIds(options, reservedTalkingIds);
            return true;
        }

        static void AddRoleIds(UnitySampleExportOptions options,
                               IReadOnlyDictionary<string, int> roleIdsBySpeaker) {
            foreach (KeyValuePair<string, int> pair in roleIdsBySpeaker) {
                options.RoleIdsBySpeaker[pair.Key] = pair.Value;
            }
        }

        static void AddBindingEntries(UnitySampleExportOptions options,
                                      IReadOnlyList<HostBindingMapEntryModel> bindingEntries) {
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

        static void AddReservedTalkingIds(UnitySampleExportOptions options,
                                          IReadOnlyCollection<int> reservedTalkingIds) {
            foreach (int talkingId in reservedTalkingIds) {
                options.ReservedTalkingIds.Add(talkingId);
            }
        }

        static int ReadIntOption(string[] args, string optionName, int fallback) {
            string? value = CliCore.ReadOption(args, optionName);
            if (string.IsNullOrWhiteSpace(value)) {
                return fallback;
            }

            if (int.TryParse(value, out int parsed)) {
                return parsed;
            }

            return fallback;
        }

    }

}