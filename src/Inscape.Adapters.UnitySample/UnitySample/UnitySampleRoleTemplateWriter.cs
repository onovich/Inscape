using System;
using System.Collections.Generic;
using System.Text;
using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleRoleTemplateWriter {

        public string Write(InscapeDocument graph) {
            return Write(graph, new Dictionary<string, int>(StringComparer.Ordinal));
        }

        public string Write(InscapeDocument graph, IReadOnlyDictionary<string, int> roleIdsBySpeaker) {
            SortedSet<string> speakers = new SortedSet<string>(StringComparer.Ordinal);
            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    if (line.Kind != NarrativeLineKind.Dialogue || string.IsNullOrWhiteSpace(line.Speaker)) {
                        continue;
                    }

                    speakers.Add(line.Speaker.Trim());
                }
            }

            StringBuilder builder = new StringBuilder();
            builder.AppendLine("speaker,roleId");
            foreach (string speaker in speakers) {
                AppendCsvField(builder, speaker);
                builder.Append(',');
                if (roleIdsBySpeaker.TryGetValue(speaker, out int roleId)) {
                    builder.Append(roleId);
                }
                builder.AppendLine();
            }
            return builder.ToString();
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

