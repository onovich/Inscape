using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Analysis {

    public sealed class StoryGraphValidatorDomain {

        public void Validate(DslScriptDocumentModel document, List<DiagnosticModel> diagnostics) {
            Dictionary<string, StoryGraphNodeModel> nodesByName = new Dictionary<string, StoryGraphNodeModel>();

            StoryGraphAnchorValidatorDomain anchorValidator = new StoryGraphAnchorValidatorDomain();
            anchorValidator.Validate(document, diagnostics);

            for (int i = 0; i < document.Nodes.Count; i += 1) {
                StoryGraphNodeModel node = document.Nodes[i];
                if (!nodesByName.ContainsKey(node.Name)) {
                    nodesByName.Add(node.Name, node);
                }

                if (node.Lines.Count == 0 && node.Choices.Count == 0 && string.IsNullOrEmpty(node.DefaultNext)) {
                    diagnostics.Add(new DiagnosticModel("INS022",
                                                   DiagnosticSeverityModel.Warning,
                                                   "Node '" + node.Name + "' is empty.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }

            for (int i = 0; i < document.Edges.Count; i += 1) {
                StoryGraphEdgeModel edge = document.Edges[i];
                if (!nodesByName.ContainsKey(edge.To)) {
                    diagnostics.Add(new DiagnosticModel("INS020",
                                                   DiagnosticSeverityModel.Error,
                                                   "Node '" + edge.From + "' references missing target '" + edge.To + "'.",
                                                   edge.Source.SourcePath,
                                                   edge.Source.Line,
                                                   edge.Source.Column));
                }
            }

            WarnUnreachableNodes(document, diagnostics, nodesByName);
        }

        static void WarnUnreachableNodes(DslScriptDocumentModel document,
                                         List<DiagnosticModel> diagnostics,
                                         Dictionary<string, StoryGraphNodeModel> nodesByName) {
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
                    StoryGraphEdgeModel edge = document.Edges[i];
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
                StoryGraphNodeModel node = document.Nodes[i];
                if (!visited.Contains(node.Name)) {
                    diagnostics.Add(new DiagnosticModel("INS021",
                                                   DiagnosticSeverityModel.Warning,
                                                   "Node '" + node.Name + "' is not reachable from the first node.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }
        }

    }

}
