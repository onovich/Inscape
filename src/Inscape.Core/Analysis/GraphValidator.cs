using System.Collections.Generic;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Core.Analysis {

    public sealed class GraphValidator {

        public void Validate(InscapeDocument document, List<Diagnostic> diagnostics) {
            Dictionary<string, NarrativeNode> nodesByName = new Dictionary<string, NarrativeNode>();
            for (int i = 0; i < document.Nodes.Count; i += 1) {
                NarrativeNode node = document.Nodes[i];
                if (!nodesByName.ContainsKey(node.Name)) {
                    nodesByName.Add(node.Name, node);
                }

                if (node.Lines.Count == 0 && node.Choices.Count == 0 && string.IsNullOrEmpty(node.DefaultNext)) {
                    diagnostics.Add(new Diagnostic("INS022",
                                                   DiagnosticSeverity.Warning,
                                                   "Node '" + node.Name + "' is empty.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }

            for (int i = 0; i < document.Edges.Count; i += 1) {
                NodeEdge edge = document.Edges[i];
                if (!nodesByName.ContainsKey(edge.To)) {
                    diagnostics.Add(new Diagnostic("INS020",
                                                   DiagnosticSeverity.Error,
                                                   "Node '" + edge.From + "' references missing target '" + edge.To + "'.",
                                                   edge.Source.SourcePath,
                                                   edge.Source.Line,
                                                   edge.Source.Column));
                }
            }

            WarnUnreachableNodes(document, diagnostics, nodesByName);
        }

        static void WarnUnreachableNodes(InscapeDocument document,
                                         List<Diagnostic> diagnostics,
                                         Dictionary<string, NarrativeNode> nodesByName) {
            if (document.Nodes.Count == 0) {
                return;
            }

            HashSet<string> visited = new HashSet<string>();
            Queue<string> queue = new Queue<string>();
            queue.Enqueue(document.Nodes[0].Name);
            visited.Add(document.Nodes[0].Name);

            while (queue.Count > 0) {
                string current = queue.Dequeue();
                for (int i = 0; i < document.Edges.Count; i += 1) {
                    NodeEdge edge = document.Edges[i];
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

            for (int i = 0; i < document.Nodes.Count; i += 1) {
                NarrativeNode node = document.Nodes[i];
                if (!visited.Contains(node.Name)) {
                    diagnostics.Add(new Diagnostic("INS021",
                                                   DiagnosticSeverity.Warning,
                                                   "Node '" + node.Name + "' is not reachable from the first node.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }
        }

    }

}
