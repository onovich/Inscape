using Inscape.Adapters.UnitySample;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleSupport {

        internal static bool TryReadUnitySampleExportOptions(string[] args, ToolConfigModel config, out UnitySampleExportOptions options) {
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

            AddUnitySampleRoleIds(options, roleIdsBySpeaker);

            string? bindingMapPath = CliCore.ReadOption(args, "--unity-sample-binding-map") ?? config.UnitySample.BindingMap;
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!HostBindingMapReaderDomain.TryRead(bindingMapPath,
                                                        out List<HostBindingMapEntryModel> bindingEntries,
                                                        out string? bindingError)) {
                    Console.Error.WriteLine(bindingError);
                    return false;
                }

                AddUnitySampleBindingEntries(options, bindingEntries);
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

        internal static bool TryReadUnitySampleTimelineBindingsForTemplate(string[] args, ToolConfigModel config, out Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, UnitySampleTimelineAssetBinding>(StringComparer.Ordinal);
            string? timelineRoot = CliCore.ReadOption(args, "--unity-sample-existing-timeline-root") ?? config.UnitySample.ExistingTimelineRoot;
            if (!TimelineAssetBindingScanDomain.TryRead(timelineRoot,
                                                        out Dictionary<string, TimelineAssetBindingModel> scannedBindingsByAlias,
                                                        out string? timelineError)) {
                Console.Error.WriteLine(timelineError);
                return false;
            }

            AddUnitySampleTimelineBindings(bindingsByAlias, scannedBindingsByAlias);

            return true;
        }

        static void AddUnitySampleRoleIds(UnitySampleExportOptions options,
                                          IReadOnlyDictionary<string, int> roleIdsBySpeaker) {
            foreach (KeyValuePair<string, int> pair in roleIdsBySpeaker) {
                options.RoleIdsBySpeaker[pair.Key] = pair.Value;
            }
        }

        static void AddUnitySampleBindingEntries(UnitySampleExportOptions options,
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

        static void AddUnitySampleTimelineBindings(Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias,
                                                   IReadOnlyDictionary<string, TimelineAssetBindingModel> scannedBindingsByAlias) {
            foreach (KeyValuePair<string, TimelineAssetBindingModel> pair in scannedBindingsByAlias) {
                bindingsByAlias.Add(pair.Key,
                                    new UnitySampleTimelineAssetBinding {
                                        TimelineId = pair.Value.TimelineId,
                                        UnityGuid = pair.Value.UnityGuid,
                                        AssetPath = pair.Value.AssetPath,
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