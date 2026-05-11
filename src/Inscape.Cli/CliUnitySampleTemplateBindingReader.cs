using Inscape.Adapters.UnitySample;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleTemplateBindingReader {

        internal static bool TryRead(string[] args,
                                     ToolConfigModel config,
                                     out Dictionary<string, TimelineAssetBindingModel> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, TimelineAssetBindingModel>(StringComparer.Ordinal);
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

        static void AddTimelineBindings(Dictionary<string, TimelineAssetBindingModel> bindingsByAlias,
                                        IReadOnlyDictionary<string, TimelineAssetBindingModel> scannedBindingsByAlias) {
            foreach (KeyValuePair<string, TimelineAssetBindingModel> pair in scannedBindingsByAlias) {
                bindingsByAlias.Add(pair.Key, pair.Value);
            }
        }

    }

}