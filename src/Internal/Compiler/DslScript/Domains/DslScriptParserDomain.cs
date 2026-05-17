using System;
using System.Collections.Generic;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Compiler.Text;

namespace Inscape.Compiler.Parsing {

    public sealed class DslScriptParserDomain {

        public DslScriptCompilationResultModel Parse(string source, string sourcePath) {
            DslScriptDocumentModel document = new DslScriptDocumentModel();
            document.SourcePath = sourcePath;

            List<DiagnosticModel> diagnostics = new List<DiagnosticModel>();
            Dictionary<string, StoryGraphNodeModel> nodesByName = new Dictionary<string, StoryGraphNodeModel>(StringComparer.Ordinal);

            StoryGraphNodeModel? currentNode = null;
            DslScriptChoiceGroupModel? currentChoice = null;
            Dictionary<string, int>? currentAnchorOccurrences = null;
            string[] lines = SplitLines(source);

            for (int i = 0; i < lines.Length; i += 1) {
                int lineNumber = i + 1;
                string raw = lines[i];
                string trimmed = raw.Trim();

                if (trimmed.Length == 0 || trimmed.StartsWith("//", StringComparison.Ordinal)) {
                    continue;
                }

                if (trimmed.StartsWith("#", StringComparison.Ordinal)) {
                    AddMissingBlankBeforeTitleDiagnostic(diagnostics, sourcePath, lineNumber, raw, lines, i);
                    currentNode = ParseTitleNode(document, diagnostics, nodesByName, sourcePath, lineNumber, raw, trimmed);
                    currentAnchorOccurrences = currentNode == null ? null : new Dictionary<string, int>(StringComparer.Ordinal);
                    currentChoice = null;
                    continue;
                }

                if (currentNode == null) {
                    diagnostics.Add(new DiagnosticModel("INS001",
                                                   DiagnosticSeverityModel.Error,
                                                   "Content must appear inside an explicit node declared with '# Title'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   FirstNonWhitespaceColumn(raw)));
                    continue;
                }

                if (trimmed.StartsWith("?", StringComparison.Ordinal)) {
                    currentChoice = ParseDslScriptChoiceGroupModel(currentNode, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                if (trimmed.StartsWith("->", StringComparison.Ordinal)) {
                    ParseJump(document, diagnostics, currentNode, sourcePath, lineNumber, raw, trimmed);
                    currentChoice = null;
                    continue;
                }

                if (trimmed.StartsWith("-", StringComparison.Ordinal)) {
                    currentChoice = ParseDslScriptChoiceOptionModel(document, diagnostics, currentNode, currentChoice, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                currentChoice = null;
                currentNode.Lines.Add(ParseLine(currentNode, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed));
            }

            if (document.Nodes.Count == 0) {
                diagnostics.Add(new DiagnosticModel("INS008",
                                               DiagnosticSeverityModel.Error,
                                               "Document does not contain any nodes.",
                                               sourcePath,
                                               1,
                                               1));
            }

            return new DslScriptCompilationResultModel(document, diagnostics);
        }

        static StoryGraphNodeModel? ParseTitleNode(DslScriptDocumentModel document,
                                        List<DiagnosticModel> diagnostics,
                                        Dictionary<string, StoryGraphNodeModel> nodesByName,
                                        string sourcePath,
                                        int lineNumber,
                                        string raw,
                                        string trimmed) {
            string title = trimmed.Substring(1).Trim();
            if (title.Length == 0) {
                diagnostics.Add(new DiagnosticModel("INS002",
                                               DiagnosticSeverityModel.Error,
                                               "Node title is required after '#'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
                return null;
            }
            if (!DslScriptNodeTitleValidatorDomain.IsValid(title)) {
                diagnostics.Add(new DiagnosticModel("INS011",
                                               DiagnosticSeverityModel.Error,
                                               "Invalid node title '" + title + "'. " + DslScriptNodeTitleValidatorDomain.Description,
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw) + 1));
            }

            StoryGraphNodeModel node = new StoryGraphNodeModel();
            node.Name = title;
            node.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            document.Nodes.Add(node);

            if (nodesByName.ContainsKey(title)) {
                diagnostics.Add(new DiagnosticModel("INS003",
                                               DiagnosticSeverityModel.Error,
                                               "Duplicate node title '" + title + "'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
            } else {
                nodesByName.Add(title, node);
            }

            return node;
        }

        static void AddMissingBlankBeforeTitleDiagnostic(List<DiagnosticModel> diagnostics,
                                                         string sourcePath,
                                                         int lineNumber,
                                                         string raw,
                                                         string[] lines,
                                                         int lineIndex) {
            if (lineIndex == 0) {
                return;
            }

            string previous = lines[lineIndex - 1].Trim();
            if (previous.Length == 0 || previous.StartsWith("//", StringComparison.Ordinal)) {
                return;
            }

            diagnostics.Add(new DiagnosticModel("INS012",
                                           DiagnosticSeverityModel.Info,
                                           "Consider adding a blank line before '# Title' to keep node boundaries readable.",
                                           sourcePath,
                                           lineNumber,
                                           FirstNonWhitespaceColumn(raw)));
        }

        static DslScriptChoiceGroupModel ParseDslScriptChoiceGroupModel(StoryGraphNodeModel currentNode,
                                            Dictionary<string, int> anchorOccurrences,
                                            string sourcePath,
                                            int lineNumber,
                                            string raw,
                                            string trimmed) {
            DslScriptChoiceGroupModel group = new DslScriptChoiceGroupModel();
            group.Prompt = trimmed.Substring(1).Trim();
            group.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            if (group.Prompt.Length > 0) {
                group.Anchor = CreateAnchor(currentNode.Name, "ChoicePrompt", string.Empty, group.Prompt, anchorOccurrences);
            }
            currentNode.Choices.Add(group);
            return group;
        }

        static DslScriptChoiceGroupModel ParseDslScriptChoiceOptionModel(DslScriptDocumentModel document,
                                             List<DiagnosticModel> diagnostics,
                                             StoryGraphNodeModel currentNode,
                                             DslScriptChoiceGroupModel? currentChoice,
                                             Dictionary<string, int> anchorOccurrences,
                                             string sourcePath,
                                             int lineNumber,
                                             string raw,
                                             string trimmed) {
            DslScriptChoiceGroupModel group = currentChoice ?? CreateImplicitDslScriptChoiceGroupModel(currentNode, diagnostics, sourcePath, lineNumber, raw);
            string body = trimmed.Substring(1).Trim();
            int arrowIndex = body.IndexOf("->", StringComparison.Ordinal);

            DslScriptChoiceOptionModel option = new DslScriptChoiceOptionModel();
            option.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));

            if (arrowIndex < 0) {
                option.Text = body;
                diagnostics.Add(new DiagnosticModel("INS006",
                                               DiagnosticSeverityModel.Error,
                                               "Choice option must include a target, for example '- Ask again -> court.loop'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
            } else {
                option.Text = body.Substring(0, arrowIndex).Trim();
                option.Target = body.Substring(arrowIndex + 2).Trim();
                if (option.Target.Length == 0) {
                    diagnostics.Add(new DiagnosticModel("INS004",
                                                   DiagnosticSeverityModel.Error,
                                                   "Jump target is required after '->'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   raw.IndexOf("->", StringComparison.Ordinal) + 3));
                } else if (!IsValidNodeReference(option.Target)) {
                    diagnostics.Add(new DiagnosticModel("INS010",
                                                   DiagnosticSeverityModel.Error,
                                                   "Invalid jump target '" + option.Target + "'. Use a valid '# Title' target.",
                                                   sourcePath,
                                                   lineNumber,
                                                   raw.IndexOf("->", StringComparison.Ordinal) + 3));
                }
            }

            option.Anchor = CreateAnchor(currentNode.Name, "ChoiceOption", string.Empty, option.Text, anchorOccurrences);
            group.Options.Add(option);

            if (option.Target.Length > 0) {
                StoryGraphEdgeModel edge = new StoryGraphEdgeModel();
                edge.From = currentNode.Name;
                edge.To = option.Target;
                edge.Kind = StoryGraphEdgeKindModel.Choice;
                edge.Label = option.Text;
                edge.Source = option.Source;
                document.Edges.Add(edge);
            }

            return group;
        }

        static DslScriptChoiceGroupModel CreateImplicitDslScriptChoiceGroupModel(StoryGraphNodeModel currentNode,
                                                     List<DiagnosticModel> diagnostics,
                                                     string sourcePath,
                                                     int lineNumber,
                                                     string raw) {
            diagnostics.Add(new DiagnosticModel("INS005",
                                           DiagnosticSeverityModel.Warning,
                                           "Choice option appears without a preceding '?' prompt; an implicit choice group was created.",
                                           sourcePath,
                                           lineNumber,
                                           FirstNonWhitespaceColumn(raw)));

            DslScriptChoiceGroupModel group = new DslScriptChoiceGroupModel();
            group.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            currentNode.Choices.Add(group);
            return group;
        }

        static void ParseJump(DslScriptDocumentModel document,
                              List<DiagnosticModel> diagnostics,
                              StoryGraphNodeModel currentNode,
                              string sourcePath,
                              int lineNumber,
                              string raw,
                              string trimmed) {
            string target = trimmed.Substring(2).Trim();
            if (target.Length == 0) {
                diagnostics.Add(new DiagnosticModel("INS004",
                                               DiagnosticSeverityModel.Error,
                                               "Jump target is required after '->'.",
                                               sourcePath,
                                               lineNumber,
                                               FirstNonWhitespaceColumn(raw)));
                return;
            }
            if (!IsValidNodeReference(target)) {
                diagnostics.Add(new DiagnosticModel("INS010",
                                               DiagnosticSeverityModel.Error,
                                               "Invalid jump target '" + target + "'. Use a valid '# Title' target.",
                                               sourcePath,
                                               lineNumber,
                                               raw.IndexOf("->", StringComparison.Ordinal) + 3));
            }

            currentNode.DefaultNext = target;

            StoryGraphEdgeModel edge = new StoryGraphEdgeModel();
            edge.From = currentNode.Name;
            edge.To = target;
            edge.Kind = StoryGraphEdgeKindModel.Default;
            edge.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            document.Edges.Add(edge);
        }

        static DslScriptLineModel ParseLine(StoryGraphNodeModel currentNode,
                                       Dictionary<string, int> anchorOccurrences,
                                       string sourcePath,
                                       int lineNumber,
                                       string raw,
                                       string trimmed) {
            DslScriptLineModel line = new DslScriptLineModel();
            line.Raw = raw;
            line.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));

            if (IsMetadata(trimmed)) {
                line.Kind = DslScriptLineKindModel.Metadata;
                line.Text = trimmed;
                return line;
            }

            int separator = FindDialogueSeparator(trimmed);
            if (separator > 0) {
                line.Kind = DslScriptLineKindModel.Dialogue;
                line.Speaker = trimmed.Substring(0, separator).Trim();
                line.Text = trimmed.Substring(separator + 1).Trim();
            } else {
                line.Kind = DslScriptLineKindModel.Narration;
                line.Text = trimmed;
            }

            line.Anchor = CreateAnchor(currentNode.Name, line.Kind.ToString(), line.Speaker, line.Text, anchorOccurrences);
            return line;
        }

        static string CreateAnchor(string nodeName,
                                   string kind,
                                   string speaker,
                                   string text,
                                   Dictionary<string, int> anchorOccurrences) {
            string occurrenceKey = TextContractStableHashDomain.ForOccurrenceKey(kind, speaker, text);
            anchorOccurrences.TryGetValue(occurrenceKey, out int occurrence);
            anchorOccurrences[occurrenceKey] = occurrence + 1;
            return TextContractStableHashDomain.ForContent(nodeName, kind, speaker, text, occurrence);
        }

        static bool IsMetadata(string trimmed) {
            if (trimmed.StartsWith("@", StringComparison.Ordinal)) {
                return true;
            }
            return trimmed.StartsWith("[", StringComparison.Ordinal) && trimmed.EndsWith("]", StringComparison.Ordinal);
        }

        static bool IsValidNodeReference(string target) {
            return DslScriptNodeTitleValidatorDomain.IsValid(target);
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
