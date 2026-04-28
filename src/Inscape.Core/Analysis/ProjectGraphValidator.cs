using System.Collections.Generic;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Core.Analysis {

    public sealed class ProjectGraphValidator {

        public void Validate(List<InscapeDocument> documents,
                             InscapeDocument graph,
                             List<Diagnostic> diagnostics) {
            Dictionary<string, NarrativeNode> nodesByName = new Dictionary<string, NarrativeNode>(System.StringComparer.Ordinal);

            for (int i = 0; i < graph.Nodes.Count; i += 1) {
                NarrativeNode node = graph.Nodes[i];
                if (nodesByName.TryGetValue(node.Name, out NarrativeNode? previous)) {
                    if (previous.Source.SourcePath != node.Source.SourcePath) {
                        diagnostics.Add(new Diagnostic("INS030",
                                                       DiagnosticSeverity.Error,
                                                       "Duplicate project node '" + node.Name + "' is already declared in "
                                                       + previous.Source.SourcePath + "(" + previous.Source.Line + "," + previous.Source.Column + ").",
                                                       node.Source.SourcePath,
                                                       node.Source.Line,
                                                       node.Source.Column));
                    }
                    continue;
                }

                nodesByName.Add(node.Name, node);

                if (node.Lines.Count == 0 && node.Choices.Count == 0 && string.IsNullOrEmpty(node.DefaultNext)) {
                    diagnostics.Add(new Diagnostic("INS022",
                                                   DiagnosticSeverity.Warning,
                                                   "Node '" + node.Name + "' is empty.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }

            for (int i = 0; i < graph.Edges.Count; i += 1) {
                NodeEdge edge = graph.Edges[i];
                if (!nodesByName.ContainsKey(edge.To)) {
                    diagnostics.Add(new Diagnostic("INS020",
                                                   DiagnosticSeverity.Error,
                                                   "Node '" + edge.From + "' references missing target '" + edge.To + "'.",
                                                   edge.Source.SourcePath,
                                                   edge.Source.Line,
                                                   edge.Source.Column));
                }
            }

            NarrativeNode? entry = FindEntryNode(documents, diagnostics);
            WarnUnreachableNodes(documents, graph, diagnostics, nodesByName, entry);
        }

        static void WarnUnreachableNodes(List<InscapeDocument> documents,
                                         InscapeDocument graph,
                                         List<Diagnostic> diagnostics,
                                         Dictionary<string, NarrativeNode> nodesByName,
                                         NarrativeNode? entry) {
            entry ??= FindFirstNode(documents);
            if (entry == null) {
                return;
            }

            HashSet<string> visited = new HashSet<string>();
            Queue<string> queue = new Queue<string>();
            queue.Enqueue(entry.Name);
            visited.Add(entry.Name);

            while (queue.Count > 0) {
                string current = queue.Dequeue();
                for (int i = 0; i < graph.Edges.Count; i += 1) {
                    NodeEdge edge = graph.Edges[i];
                    if (edge.From != current) {
                        continue;
                    }
                    if (!nodesByName.ContainsKey(edge.To)) {
                        continue;
                    }
                    if (visited.Add(edge.To)) {
                        queue.Enqueue(edge.To);
                    }
                }
            }

            for (int i = 0; i < graph.Nodes.Count; i += 1) {
                NarrativeNode node = graph.Nodes[i];
                if (!visited.Contains(node.Name)) {
                    diagnostics.Add(new Diagnostic("INS021",
                                                   DiagnosticSeverity.Warning,
                                                   "Node '" + node.Name + "' is not reachable from project entry '" + entry.Name + "'.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }
        }

        static NarrativeNode? FindEntryNode(List<InscapeDocument> documents, List<Diagnostic> diagnostics) {
            NarrativeNode? entry = null;
            SourceSpan entrySource = SourceSpan.Empty;

            for (int i = 0; i < documents.Count; i += 1) {
                InscapeDocument document = documents[i];
                for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                    NarrativeNode node = document.Nodes[nodeIndex];
                    for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                        NarrativeLine line = node.Lines[lineIndex];
                        if (!IsEntryMetadata(line)) {
                            continue;
                        }

                        if (entry == null) {
                            entry = node;
                            entrySource = line.Source;
                            continue;
                        }

                        diagnostics.Add(new Diagnostic("INS031",
                                                       DiagnosticSeverity.Error,
                                                       "Multiple project entries are declared. First entry is '" + entry.Name + "' at "
                                                       + entrySource.SourcePath + "(" + entrySource.Line + "," + entrySource.Column + ").",
                                                       line.Source.SourcePath,
                                                       line.Source.Line,
                                                       line.Source.Column));
                    }
                }
            }

            if (entry == null) {
                NarrativeNode? fallback = FindFirstNode(documents);
                if (fallback != null) {
                    diagnostics.Add(new Diagnostic("INS032",
                                                   DiagnosticSeverity.Info,
                                                   "Project entry is not declared with '@entry'; falling back to first project node '" + fallback.Name + "'.",
                                                   fallback.Source.SourcePath,
                                                   fallback.Source.Line,
                                                   fallback.Source.Column));
                }
            }

            return entry;
        }

        static bool IsEntryMetadata(NarrativeLine line) {
            return line.Kind == NarrativeLineKind.Metadata
                && string.Equals(line.Text.Trim(), "@entry", System.StringComparison.Ordinal);
        }

        static NarrativeNode? FindFirstNode(List<InscapeDocument> documents) {
            for (int i = 0; i < documents.Count; i += 1) {
                InscapeDocument document = documents[i];
                if (document.Nodes.Count > 0) {
                    return document.Nodes[0];
                }
            }

            return null;
        }

    }

}
