using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Compiler.Parsing;

namespace Inscape.Compiler.Analysis {

    public sealed class StoryGraphCompilationValidatorDomain {

        public void Validate(List<DslScriptDocumentModel> documents,
                             DslScriptDocumentModel graph,
                             List<DiagnosticModel> diagnostics) {
            Validate(documents, graph, diagnostics, string.Empty);
        }

        public string Validate(List<DslScriptDocumentModel> documents,
                               DslScriptDocumentModel graph,
                               List<DiagnosticModel> diagnostics,
                               string entryOverrideName) {
            Dictionary<string, StoryGraphNodeModel> nodesByName = new Dictionary<string, StoryGraphNodeModel>(System.StringComparer.Ordinal);

            StoryGraphAnchorValidatorDomain anchorValidator = new StoryGraphAnchorValidatorDomain();
            anchorValidator.Validate(graph, diagnostics);

            for (int i = 0; i < graph.Nodes.Count; i += 1) {
                StoryGraphNodeModel node = graph.Nodes[i];
                if (nodesByName.TryGetValue(node.Name, out StoryGraphNodeModel? previous)) {
                    if (previous.Source.SourcePath != node.Source.SourcePath) {
                        diagnostics.Add(new DiagnosticModel("INS030",
                                                       DiagnosticSeverityModel.Error,
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
                    diagnostics.Add(new DiagnosticModel("INS022",
                                                   DiagnosticSeverityModel.Warning,
                                                   "Node '" + node.Name + "' is empty.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }

            for (int i = 0; i < graph.Edges.Count; i += 1) {
                StoryGraphEdgeModel edge = graph.Edges[i];
                if (!nodesByName.ContainsKey(edge.To)) {
                    diagnostics.Add(new DiagnosticModel("INS020",
                                                   DiagnosticSeverityModel.Error,
                                                   "Node '" + edge.From + "' references missing target '" + edge.To + "'.",
                                                   edge.Source.SourcePath,
                                                   edge.Source.Line,
                                                   edge.Source.Column));
                }
            }

            bool hasEntryOverride = !string.IsNullOrWhiteSpace(entryOverrideName);
            StoryGraphNodeModel? declaredEntry = FindEntryNode(documents, diagnostics, !hasEntryOverride);
            StoryGraphNodeModel? entry = hasEntryOverride
                ? FindEntryOverride(graph, diagnostics, nodesByName, entryOverrideName)
                : declaredEntry;
            WarnUnreachableNodes(graph, diagnostics, nodesByName, entry);

            return entry == null ? string.Empty : entry.Name;
        }

        static void WarnUnreachableNodes(DslScriptDocumentModel graph,
                                         List<DiagnosticModel> diagnostics,
                                         Dictionary<string, StoryGraphNodeModel> nodesByName,
                                         StoryGraphNodeModel? entry) {
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
                    StoryGraphEdgeModel edge = graph.Edges[i];
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
                StoryGraphNodeModel node = graph.Nodes[i];
                if (!visited.Contains(node.Name)) {
                    diagnostics.Add(new DiagnosticModel("INS021",
                                                   DiagnosticSeverityModel.Warning,
                                                   "Node '" + node.Name + "' is not reachable from project entry '" + entry.Name + "'.",
                                                   node.Source.SourcePath,
                                                   node.Source.Line,
                                                   node.Source.Column));
                }
            }
        }

        static StoryGraphNodeModel? FindEntryOverride(DslScriptDocumentModel graph,
                                                List<DiagnosticModel> diagnostics,
                                                Dictionary<string, StoryGraphNodeModel> nodesByName,
                                                string entryOverrideName) {
            string entryName = entryOverrideName.Trim();
            if (!DslScriptNodeTitleValidatorDomain.IsValid(entryName)) {
                diagnostics.Add(new DiagnosticModel("INS033",
                                               DiagnosticSeverityModel.Error,
                                               "Invalid project entry override '" + entryName + "'. " + DslScriptNodeTitleValidatorDomain.Description,
                                               graph.SourcePath,
                                               1,
                                               1));
                return null;
            }

            if (nodesByName.TryGetValue(entryName, out StoryGraphNodeModel? entry)) {
                return entry;
            }

            diagnostics.Add(new DiagnosticModel("INS034",
                                           DiagnosticSeverityModel.Error,
                                           "Project entry override references missing node '" + entryName + "'.",
                                           graph.SourcePath,
                                           1,
                                           1));
            return null;
        }

        static StoryGraphNodeModel? FindEntryNode(List<DslScriptDocumentModel> documents,
                                            List<DiagnosticModel> diagnostics,
                                            bool reportFallback) {
            StoryGraphNodeModel? entry = null;
            SourceSpanModel entrySource = SourceSpanModel.Empty;

            for (int i = 0; i < documents.Count; i += 1) {
                DslScriptDocumentModel document = documents[i];
                for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                    StoryGraphNodeModel node = document.Nodes[nodeIndex];
                    for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                        DslScriptLineModel line = node.Lines[lineIndex];
                        if (!IsEntryMetadata(line)) {
                            continue;
                        }

                        if (entry == null) {
                            entry = node;
                            entrySource = line.Source;
                            continue;
                        }

                        diagnostics.Add(new DiagnosticModel("INS031",
                                                       DiagnosticSeverityModel.Error,
                                                       "Multiple project entries are declared. First entry is '" + entry.Name + "' at "
                                                       + entrySource.SourcePath + "(" + entrySource.Line + "," + entrySource.Column + ").",
                                                       line.Source.SourcePath,
                                                       line.Source.Line,
                                                       line.Source.Column));
                    }
                }
            }

            if (entry == null && reportFallback) {
                StoryGraphNodeModel? fallback = FindFirstNode(documents);
                if (fallback != null) {
                    diagnostics.Add(new DiagnosticModel("INS032",
                                                   DiagnosticSeverityModel.Info,
                                                   "Project entry is not declared with '@entry'; falling back to first project node '" + fallback.Name + "'.",
                                                   fallback.Source.SourcePath,
                                                   fallback.Source.Line,
                                                   fallback.Source.Column));
                    return fallback;
                }
            }

            return entry;
        }

        static bool IsEntryMetadata(DslScriptLineModel line) {
            return line.Kind == DslScriptLineKindModel.Metadata
                && string.Equals(line.Text.Trim(), "@entry", System.StringComparison.Ordinal);
        }

        static StoryGraphNodeModel? FindFirstNode(List<DslScriptDocumentModel> documents) {
            for (int i = 0; i < documents.Count; i += 1) {
                DslScriptDocumentModel document = documents[i];
                if (document.Nodes.Count > 0) {
                    return document.Nodes[0];
                }
            }

            return null;
        }

    }

}
