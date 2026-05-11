using System.Text;
using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleSupport {

        internal static void WriteUnitySampleExport(string outputDirectory, UnitySampleExportResult export, JsonSerializerOptions jsonOptions) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, jsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-unity-sample-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

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

        internal static string WriteUnitySampleRoleTemplateReport(InscapeDocument graph,
                                                                  IReadOnlyDictionary<string, int> roleIdsBySpeaker,
                                                                  IReadOnlyDictionary<string, List<RoleNameBindingCandidateModel>> candidatesBySpeaker,
                                                                  bool scannedRoleNameCsv) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("speaker,status,roleId,candidateRoleIds,candidateDescriptions,candidateLanguages");
            foreach (string speaker in CollectDialogueSpeakers(graph)) {
                roleIdsBySpeaker.TryGetValue(speaker, out int roleId);
                candidatesBySpeaker.TryGetValue(speaker, out List<RoleNameBindingCandidateModel>? candidates);
                string status = CreateUnitySampleRoleReportStatus(roleIdsBySpeaker.ContainsKey(speaker), candidates, scannedRoleNameCsv);
                AppendCsvField(builder, speaker);
                builder.Append(',');
                AppendCsvField(builder, status);
                builder.Append(',');
                AppendCsvField(builder, roleIdsBySpeaker.ContainsKey(speaker) ? roleId.ToString() : string.Empty);
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateIds(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateDescriptions(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateLanguages(candidates));
                builder.AppendLine();
            }
            return builder.ToString();
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

        static string CreateUnitySampleRoleReportStatus(bool hasUniqueRoleId,
                                                        List<RoleNameBindingCandidateModel>? candidates,
                                                        bool scannedRoleNameCsv) {
            if (hasUniqueRoleId) {
                return "unique";
            }
            if (!scannedRoleNameCsv) {
                return "unscanned";
            }
            if (candidates != null && candidates.Count > 0) {
                return "ambiguous";
            }
            return "missing";
        }

        static SortedSet<string> CollectDialogueSpeakers(InscapeDocument graph) {
            SortedSet<string> speakers = new SortedSet<string>(StringComparer.Ordinal);
            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    if (line.Kind == NarrativeLineKind.Dialogue && !string.IsNullOrWhiteSpace(line.Speaker)) {
                        speakers.Add(line.Speaker.Trim());
                    }
                }
            }
            return speakers;
        }

        static string JoinRoleCandidateIds(List<RoleNameBindingCandidateModel>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<int> ids = new SortedSet<int>();
            for (int i = 0; i < candidates.Count; i += 1) {
                ids.Add(candidates[i].RoleId);
            }
            return string.Join("|", ids);
        }

        static string JoinRoleCandidateDescriptions(List<RoleNameBindingCandidateModel>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<string> descriptions = new SortedSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < candidates.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(candidates[i].Description)) {
                    descriptions.Add(candidates[i].RoleId + ":" + candidates[i].Description);
                }
            }
            return string.Join("|", descriptions);
        }

        static string JoinRoleCandidateLanguages(List<RoleNameBindingCandidateModel>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<string> languages = new SortedSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < candidates.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(candidates[i].Language)) {
                    languages.Add(candidates[i].Language);
                }
            }
            return string.Join("|", languages);
        }

        static void AppendCsvField(StringBuilder builder, string value) {
            bool needsQuotes = value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0;
            if (!needsQuotes) {
                builder.Append(value);
                return;
            }

            builder.Append('"');
            for (int i = 0; i < value.Length; i += 1) {
                char c = value[i];
                if (c == '"') {
                    builder.Append("\"\"");
                } else {
                    builder.Append(c);
                }
            }
            builder.Append('"');
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