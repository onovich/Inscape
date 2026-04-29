using System.Collections.Generic;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using Inscape.Core.Parsing;

namespace Inscape.Core.Analysis {

    public sealed class ProjectGraphValidator {

        public void Validate(List<InscapeDocument> documents,
                             InscapeDocument graph,
                             List<Diagnostic> diagnostics) {
            Validate(documents, graph, diagnostics, string.Empty);
        }

        public string Validate(List<InscapeDocument> documents,
                               InscapeDocument graph,
                               List<Diagnostic> diagnostics,
                               string entryOverrideName) {
            Dictionary<string, NarrativeNode> nodesByName = new Dictionary<string, NarrativeNode>(System.StringComparer.Ordinal);

            AnchorValidator anchorValidator = new AnchorValidator();
            anchorValidator.Validate(graph, diagnostics);

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

            bool hasEntryOverride = !string.IsNullOrWhiteSpace(entryOverrideName);
            NarrativeNode? declaredEntry = FindEntryNode(documents, diagnostics, !hasEntryOverride);
            NarrativeNode? entry = hasEntryOverride
                ? FindEntryOverride(graph, diagnostics, nodesByName, entryOverrideName)
                : declaredEntry;
            WarnUnreachableNodes(graph, diagnostics, nodesByName, entry);

            return entry == null ? string.Empty : entry.Name;
        }

        static void WarnUnreachableNodes(InscapeDocument graph,
                                         List<Diagnostic> diagnostics,
                                         Dictionary<string, NarrativeNode> nodesByName,
                                         NarrativeNode? entry) {
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

        static NarrativeNode? FindEntryOverride(InscapeDocument graph,
                                                List<Diagnostic> diagnostics,
                                                Dictionary<string, NarrativeNode> nodesByName,
                                                string entryOverrideName) {
            string entryName = entryOverrideName.Trim();
            if (!NodeNameRules.IsValid(entryName)) {
                diagnostics.Add(new Diagnostic("INS033",
                                               DiagnosticSeverity.Error,
                                               "Invalid project entry override '" + entryName + "'. " + NodeNameRules.Description,
                                               graph.SourcePath,
                                               1,
                                               1));
                return null;
            }

            if (nodesByName.TryGetValue(entryName, out NarrativeNode? entry)) {
                return entry;
            }

            diagnostics.Add(new Diagnostic("INS034",
                                           DiagnosticSeverity.Error,
                                           "Project entry override references missing node '" + entryName + "'.",
                                           graph.SourcePath,
                                           1,
                                           1));
            return null;
        }

        static NarrativeNode? FindEntryNode(List<InscapeDocument> documents,
                                            List<Diagnostic> diagnostics,
                                            bool reportFallback) {
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

            if (entry == null && reportFallback) {
                NarrativeNode? fallback = FindFirstNode(documents);
                if (fallback != null) {
                    diagnostics.Add(new Diagnostic("INS032",
                                                   DiagnosticSeverity.Info,
                                                   "Project entry is not declared with '@entry'; falling back to first project node '" + fallback.Name + "'.",
                                                   fallback.Source.SourcePath,
                                                   fallback.Source.Line,
                                                   fallback.Source.Column));
                    return fallback;
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
