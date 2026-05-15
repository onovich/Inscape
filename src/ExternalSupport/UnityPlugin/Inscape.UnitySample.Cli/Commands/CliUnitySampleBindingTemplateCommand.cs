using Inscape.Adapters.UnitySample;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.UnitySample.Cli {

    static class CliUnitySampleBindingTemplateCommand {

        internal static int Run(StoryGraphCompilationResultModel result,
                                string[] args,
                                ToolConfigModel config,
                                string? outputPath) {
            if (!TryReadTimelineBindings(args, config, out Dictionary<string, TimelineAssetBindingModel> timelineBindingsByAlias)) {
                return 1;
            }

            UnitySampleCli.WriteOrPrint(outputPath, WriteBindingTemplate(result.Graph, timelineBindingsByAlias));
            UnitySampleCli.PrintDiagnostics(result.Diagnostics);
            return result.HasErrors ? 1 : 0;
        }

        static bool TryReadTimelineBindings(string[] args,
                                            ToolConfigModel config,
                                            out Dictionary<string, TimelineAssetBindingModel> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, TimelineAssetBindingModel>(StringComparer.Ordinal);
            string? timelineRoot = UnitySampleCli.ReadOption(args, "--unity-sample-existing-timeline-root") ?? config.UnitySample.ExistingTimelineRoot;
            if (!TimelineAssetBindingScanDomain.TryRead(timelineRoot,
                                                        out Dictionary<string, TimelineAssetBindingModel> scannedBindingsByAlias,
                                                        out string? timelineError)) {
                Console.Error.WriteLine(timelineError);
                return false;
            }

            foreach (KeyValuePair<string, TimelineAssetBindingModel> pair in scannedBindingsByAlias) {
                bindingsByAlias.Add(pair.Key, pair.Value);
            }

            return true;
        }

        static string WriteBindingTemplate(DslScriptDocumentModel graph,
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
