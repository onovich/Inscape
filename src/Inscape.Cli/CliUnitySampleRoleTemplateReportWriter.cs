using System.Text;
using Inscape.Core.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliUnitySampleRoleTemplateReportWriter {

        internal static string Write(InscapeDocument graph,
                                     IReadOnlyDictionary<string, int> roleIdsBySpeaker,
                                     IReadOnlyDictionary<string, List<RoleNameBindingCandidateModel>> candidatesBySpeaker,
                                     bool scannedRoleNameCsv) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("speaker,status,roleId,candidateRoleIds,candidateDescriptions,candidateLanguages");
            foreach (string speaker in CollectDialogueSpeakers(graph)) {
                roleIdsBySpeaker.TryGetValue(speaker, out int roleId);
                candidatesBySpeaker.TryGetValue(speaker, out List<RoleNameBindingCandidateModel>? candidates);
                string status = CreateStatus(roleIdsBySpeaker.ContainsKey(speaker), candidates, scannedRoleNameCsv);
                AppendCsvField(builder, speaker);
                builder.Append(',');
                AppendCsvField(builder, status);
                builder.Append(',');
                AppendCsvField(builder, roleIdsBySpeaker.ContainsKey(speaker) ? roleId.ToString() : string.Empty);
                builder.Append(',');
                AppendCsvField(builder, JoinCandidateIds(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinCandidateDescriptions(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinCandidateLanguages(candidates));
                builder.AppendLine();
            }

            return builder.ToString();
        }

        static string CreateStatus(bool hasUniqueRoleId,
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

        static string JoinCandidateIds(List<RoleNameBindingCandidateModel>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<int> ids = new SortedSet<int>();
            for (int i = 0; i < candidates.Count; i += 1) {
                ids.Add(candidates[i].RoleId);
            }

            return string.Join("|", ids);
        }

        static string JoinCandidateDescriptions(List<RoleNameBindingCandidateModel>? candidates) {
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

        static string JoinCandidateLanguages(List<RoleNameBindingCandidateModel>? candidates) {
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

    }

}