using Inscape.Adapters.UnitySample;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleBindingTemplateWriter {

        internal static string Write(InscapeDocument graph,
                                     IReadOnlyDictionary<string, TimelineAssetBindingModel> bindingsByAlias) {
            Dictionary<string, UnitySampleTimelineAssetBinding> unitySampleBindingsByAlias = new Dictionary<string, UnitySampleTimelineAssetBinding>(StringComparer.Ordinal);
            foreach (KeyValuePair<string, TimelineAssetBindingModel> pair in bindingsByAlias) {
                unitySampleBindingsByAlias.Add(pair.Key,
                                               new UnitySampleTimelineAssetBinding {
                                                   TimelineId = pair.Value.TimelineId,
                                                   UnityGuid = pair.Value.UnityGuid,
                                                   AssetPath = pair.Value.AssetPath,
                                               });
            }

            UnitySampleBindingTemplateWriter bindingWriter = new UnitySampleBindingTemplateWriter();
            return bindingWriter.Write(graph, unitySampleBindingsByAlias);
        }

    }

}