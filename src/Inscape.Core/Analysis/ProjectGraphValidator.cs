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

            WarnUnreachableNodes(documents, graph, diagnostics, nodesByName);
        }

        static void WarnUnreachableNodes(List<InscapeDocument> documents,
                                         InscapeDocument graph,
                                         List<Diagnostic> diagnostics,
                                         Dictionary<string, NarrativeNode> nodesByName) {
            NarrativeNode? entry = FindFirstNode(documents);
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
                                                   "Node '" + node.Name + "' is not reachable from the first project node.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }
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
