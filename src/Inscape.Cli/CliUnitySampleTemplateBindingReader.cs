using Inscape.Adapters.UnitySample;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleTemplateBindingReader {

        internal static bool TryRead(string[] args,
                                     ToolConfigModel config,
                                     out Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, UnitySampleTimelineAssetBinding>(StringComparer.Ordinal);
            string? timelineRoot = CliCore.ReadOption(args, "--unity-sample-existing-timeline-root") ?? config.UnitySample.ExistingTimelineRoot;
            if (!TimelineAssetBindingScanDomain.TryRead(timelineRoot,
                                                        out Dictionary<string, TimelineAssetBindingModel> scannedBindingsByAlias,
                                                        out string? timelineError)) {
                Console.Error.WriteLine(timelineError);
                return false;
            }

            AddTimelineBindings(bindingsByAlias, scannedBindingsByAlias);
            return true;
        }

        static void AddTimelineBindings(Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias,
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

    }

}