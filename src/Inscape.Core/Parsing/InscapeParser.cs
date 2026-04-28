using System;
using System.Collections.Generic;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;
using Inscape.Core.Text;

namespace Inscape.Core.Parsing {

    public sealed class InscapeParser {

        public CompilationResult Parse(string source, string sourcePath) {
            InscapeDocument document = new InscapeDocument();
            document.SourcePath = sourcePath;

            List<Diagnostic> diagnostics = new List<Diagnostic>();
            Dictionary<string, NarrativeNode> nodesByName = new Dictionary<string, NarrativeNode>(StringComparer.Ordinal);

            NarrativeNode? currentNode = null;
            ChoiceGroup? currentChoice = null;
            string[] lines = SplitLines(source);

            for (int i = 0; i < lines.Length; i += 1) {
                int lineNumber = i + 1;
                string raw = lines[i];
                string trimmed = raw.Trim();

                if (trimmed.Length == 0 || trimmed.StartsWith("//", StringComparison.Ordinal)) {
                    continue;
                }

                if (trimmed.StartsWith("::", StringComparison.Ordinal)) {
                    currentNode = ParseNode(document, diagnostics, nodesByName, sourcePath, lineNumber, raw, trimmed);
                    currentChoice = null;
                    continue;
                }

                if (currentNode == null) {
                    diagnostics.Add(new Diagnostic("INS001",
                                                   DiagnosticSeverity.Error,
                                                   "Content must appear inside an explicit node declared with ':: node.name'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   FirstNonWhitespaceColumn(raw)));
                    continue;
                }

                if (trimmed.StartsWith("?", StringComparison.Ordinal)) {
                    currentChoice = ParseChoiceGroup(currentNode, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                if (trimmed.StartsWith("->", StringComparison.Ordinal)) {
                    ParseJump(document, diagnostics, currentNode, sourcePath, lineNumber, raw, trimmed);
                    currentChoice = null;
                    continue;
                }

                if (trimmed.StartsWith("-", StringComparison.Ordinal)) {
                    currentChoice = ParseChoiceOption(document, diagnostics, currentNode, currentChoice, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                currentChoice = null;
                currentNode.Lines.Add(ParseLine(currentNode, sourcePath, lineNumber, raw, trimmed));
            }

            if (document.Nodes.Count == 0) {
                diagnostics.Add(new Diagnostic("INS008",
                                               DiagnosticSeverity.Error,
                                               "Document does not contain any nodes.",
                                               sourcePath,
                                               1,
                                               1));
            }

            return new CompilationResult(document, diagnostics);
        }

        static NarrativeNode? ParseNode(InscapeDocument document,
                                        List<Diagnostic> diagnostics,
                                        Dictionary<string, NarrativeNode> nodesByName,
                                        string sourcePath,
                                        int lineNumber,
                                        string raw,
                                        string trimmed) {
            string name = trimmed.Substring(2).Trim();
            if (name.Length == 0) {
                diagnostics.Add(new Diagnostic("INS002",
                                               DiagnosticSeverity.Error,
                                               "Node name is required after '::'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
                return null;
            }
            if (!NodeNameRules.IsValid(name)) {
                diagnostics.Add(new Diagnostic("INS009",
                                               DiagnosticSeverity.Error,
                                               "Invalid node name '" + name + "'. " + NodeNameRules.Description,
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw) + 2));
            }

            NarrativeNode node = new NarrativeNode();
            node.Name = name;
            node.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            document.Nodes.Add(node);

            if (nodesByName.ContainsKey(name)) {
                diagnostics.Add(new Diagnostic("INS003",
                                               DiagnosticSeverity.Error,
                                               "Duplicate node name '" + name + "'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
            } else {
                nodesByName.Add(name, node);
            }

            return node;
        }

        static ChoiceGroup ParseChoiceGroup(NarrativeNode currentNode,
                                            string sourcePath,
                                            int lineNumber,
                                            string raw,
                                            string trimmed) {
            ChoiceGroup group = new ChoiceGroup();
            group.Prompt = trimmed.Substring(1).Trim();
            group.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            currentNode.Choices.Add(group);
            return group;
        }

        static ChoiceGroup ParseChoiceOption(InscapeDocument document,
                                             List<Diagnostic> diagnostics,
                                             NarrativeNode currentNode,
                                             ChoiceGroup? currentChoice,
                                             string sourcePath,
                                             int lineNumber,
                                             string raw,
                                             string trimmed) {
            ChoiceGroup group = currentChoice ?? CreateImplicitChoiceGroup(currentNode, diagnostics, sourcePath, lineNumber, raw);
            string body = trimmed.Substring(1).Trim();
            int arrowIndex = body.IndexOf("->", StringComparison.Ordinal);

            ChoiceOption option = new ChoiceOption();
            option.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));

            if (arrowIndex < 0) {
                option.Text = body;
                diagnostics.Add(new Diagnostic("INS006",
                                               DiagnosticSeverity.Error,
                                               "Choice option must include a target, for example '- Ask again -> court.loop'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
            } else {
                option.Text = body.Substring(0, arrowIndex).Trim();
                option.Target = body.Substring(arrowIndex + 2).Trim();
                if (option.Target.Length == 0) {
                    diagnostics.Add(new Diagnostic("INS004",
                                                   DiagnosticSeverity.Error,
                                                   "Jump target is required after '->'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   raw.IndexOf("->", StringComparison.Ordinal) + 3));
                } else if (!NodeNameRules.IsValid(option.Target)) {
                    diagnostics.Add(new Diagnostic("INS010",
                                                   DiagnosticSeverity.Error,
                                                   "Invalid jump target '" + option.Target + "'. " + NodeNameRules.Description,
                                                   sourcePath,
                                                   lineNumber,
                                                   raw.IndexOf("->", StringComparison.Ordinal) + 3));
                }
            }

            option.Anchor = StableHash.ForLine(sourcePath, currentNode.Name, lineNumber, option.Text);
            group.Options.Add(option);

            if (option.Target.Length > 0) {
                NodeEdge edge = new NodeEdge();
                edge.From = currentNode.Name;
                edge.To = option.Target;
                edge.Kind = NodeEdgeKind.Choice;
                edge.Label = option.Text;
                edge.Source = option.Source;
                document.Edges.Add(edge);
            }

            return group;
        }

        static ChoiceGroup CreateImplicitChoiceGroup(NarrativeNode currentNode,
                                                     List<Diagnostic> diagnostics,
                                                     string sourcePath,
                                                     int lineNumber,
                                                     string raw) {
            diagnostics.Add(new Diagnostic("INS005",
                                           DiagnosticSeverity.Warning,
                                           "Choice option appears without a preceding '?' prompt; an implicit choice group was created.",
                                           sourcePath,
                                           lineNumber,
                                           FirstNonWhitespaceColumn(raw)));

            ChoiceGroup group = new ChoiceGroup();
            group.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            currentNode.Choices.Add(group);
            return group;
        }

        static void ParseJump(InscapeDocument document,
                              List<Diagnostic> diagnostics,
                              NarrativeNode currentNode,
                              string sourcePath,
                              int lineNumber,
                              string raw,
                              string trimmed) {
            string target = trimmed.Substring(2).Trim();
            if (target.Length == 0) {
                diagnostics.Add(new Diagnostic("INS004",
                                               DiagnosticSeverity.Error,
                                               "Jump target is required after '->'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
                return;
            }
            if (!NodeNameRules.IsValid(target)) {
                diagnostics.Add(new Diagnostic("INS010",
                                               DiagnosticSeverity.Error,
                                               "Invalid jump target '" + target + "'. " + NodeNameRules.Description,
                                               sourcePath,
                                               lineNumber,
                                               raw.IndexOf("->", StringComparison.Ordinal) + 3));
            }

            currentNode.DefaultNext = target;

            NodeEdge edge = new NodeEdge();
            edge.From = currentNode.Name;
            edge.To = target;
            edge.Kind = NodeEdgeKind.Default;
            edge.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            document.Edges.Add(edge);
        }

        static NarrativeLine ParseLine(NarrativeNode currentNode,
                                       string sourcePath,
                                       int lineNumber,
                                       string raw,
                                       string trimmed) {
            NarrativeLine line = new NarrativeLine();
            line.Raw = raw;
            line.Source = new SourceSpan(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));

            if (IsMetadata(trimmed)) {
                line.Kind = NarrativeLineKind.Metadata;
                line.Text = trimmed;
                return line;
            }

            int separator = FindDialogueSeparator(trimmed);
            if (separator > 0) {
                line.Kind = NarrativeLineKind.Dialogue;
                line.Speaker = trimmed.Substring(0, separator).Trim();
                line.Text = trimmed.Substring(separator + 1).Trim();
            } else {
                line.Kind = NarrativeLineKind.Narration;
                line.Text = trimmed;
            }

            line.Anchor = StableHash.ForLine(sourcePath, currentNode.Name, lineNumber, line.Text);
            return line;
        }

        static bool IsMetadata(string trimmed) {
            if (trimmed.StartsWith("@", StringComparison.Ordinal)) {
                return true;
            }
            return trimmed.StartsWith("[", StringComparison.Ordinal) && trimmed.EndsWith("]", StringComparison.Ordinal);
        }

        static int FindDialogueSeparator(string text) {
            int fullWidth = text.IndexOf('：');
            int halfWidth = text.IndexOf(':');

            if (fullWidth < 0) {
                return halfWidth;
            }
            if (halfWidth < 0) {
                return fullWidth;
            }
            return Math.Min(fullWidth, halfWidth);
        }

        static int FirstNonWhitespaceColumn(string raw) {
            for (int i = 0; i < raw.Length; i += 1) {
                if (!char.IsWhiteSpace(raw[i])) {
                    return i + 1;
                }
            }
            return 1;
        }

        static string[] SplitLines(string source) {
            string normalized = source.Replace("\r\n", "\n").Replace('\r', '\n');
            return normalized.Split(new[] { '\n' }, StringSplitOptions.None);
        }

    }

}
