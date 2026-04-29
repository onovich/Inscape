using System;
using System.Collections.Generic;
using System.Text;
using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdBindingTemplateWriter {

        public string Write(InscapeDocument graph) {
            SortedSet<string> timelineAliases = new SortedSet<string>(StringComparer.Ordinal);
            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    if (line.Kind != NarrativeLineKind.Metadata) {
                        continue;
                    }

                    if (BirdHostHookParser.TryParseTimelineHook(line.Text, out string alias)) {
                        timelineAliases.Add(alias);
                    }
                }
            }

            StringBuilder builder = new StringBuilder();
            builder.AppendLine("kind,alias,birdId,unityGuid,addressableKey,assetPath");
            foreach (string alias in timelineAliases) {
                AppendCsvField(builder, "timeline");
                builder.Append(',');
                AppendCsvField(builder, alias);
                builder.Append(",,,,");
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
