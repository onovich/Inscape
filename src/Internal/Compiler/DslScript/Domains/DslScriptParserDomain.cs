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
            ConditionalJumpFallbackState? pendingConditionalJumpFallback = null;
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
                    ReportMissingConditionalFallback(diagnostics, ref pendingConditionalJumpFallback);
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
                    if (IsConditionalJumpLine(raw, trimmed)) {
                        currentChoice = null;
                        ParseConditionalJump(document, diagnostics, currentNode, sourcePath, lineNumber, raw, trimmed);
                        pendingConditionalJumpFallback ??= new ConditionalJumpFallbackState(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
                        continue;
                    }

                    ReportMissingConditionalFallback(diagnostics, ref pendingConditionalJumpFallback);
                    currentChoice = ParseDslScriptChoiceGroupModel(currentNode, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                if (trimmed.StartsWith("->", StringComparison.Ordinal)) {
                    ParseJump(document, diagnostics, currentNode, sourcePath, lineNumber, raw, trimmed);
                    pendingConditionalJumpFallback = null;
                    currentChoice = null;
                    continue;
                }

                if (trimmed.StartsWith("-", StringComparison.Ordinal)) {
                    ReportMissingConditionalFallback(diagnostics, ref pendingConditionalJumpFallback);
                    currentChoice = ParseDslScriptChoiceOptionModel(document, diagnostics, currentNode, currentChoice, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed);
                    continue;
                }

                ReportMissingConditionalFallback(diagnostics, ref pendingConditionalJumpFallback);
                currentChoice = null;
                currentNode.Lines.Add(ParseLine(currentNode, currentAnchorOccurrences!, sourcePath, lineNumber, raw, trimmed));
            }

            ReportMissingConditionalFallback(diagnostics, ref pendingConditionalJumpFallback);

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
            int bodyStart = FindMarkerBodyStart(raw, '-');
            int bodyContentStart = FindTrimmedBodyStart(raw, bodyStart);
            string body = raw.Substring(bodyContentStart).Trim();
            DslScriptConditionModel? condition = null;
            int bodyAfterConditionStart = bodyContentStart;

            if (body.StartsWith("[", StringComparison.Ordinal)) {
                int openBracket = raw.IndexOf('[', bodyContentStart);
                int closeBracket = FindConditionClosingBracket(raw, openBracket);
                if (closeBracket < 0) {
                    diagnostics.Add(new DiagnosticModel("INS051",
                                                   DiagnosticSeverityModel.Error,
                                                   "Condition expression is missing a closing ']'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   openBracket + 1));
                } else {
                    condition = ParseCondition(diagnostics, sourcePath, lineNumber, raw, openBracket, closeBracket);
                    bodyAfterConditionStart = closeBracket + 1;
                    body = raw.Substring(bodyAfterConditionStart).Trim();
                }
            }

            int arrowIndex = body.IndexOf("->", StringComparison.Ordinal);

            DslScriptChoiceOptionModel option = new DslScriptChoiceOptionModel();
            option.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));
            option.Condition = condition;

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
                int absoluteArrowIndex = bodyAfterConditionStart + raw.Substring(bodyAfterConditionStart).IndexOf("->", StringComparison.Ordinal);
                if (option.Target.Length == 0) {
                    diagnostics.Add(new DiagnosticModel("INS004",
                                                   DiagnosticSeverityModel.Error,
                                                   "Jump target is required after '->'.",
                                                   sourcePath,
                                                   lineNumber,
                                                   absoluteArrowIndex + 3));
                } else if (!IsValidNodeReference(option.Target)) {
                    diagnostics.Add(new DiagnosticModel("INS010",
                                                   DiagnosticSeverityModel.Error,
                                                   "Invalid jump target '" + option.Target + "'. Use a valid '# Title' target.",
                                                   sourcePath,
                                                   lineNumber,
                                                   absoluteArrowIndex + 3));
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
                edge.Condition = option.Condition;
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

        static void ParseConditionalJump(DslScriptDocumentModel document,
                                         List<DiagnosticModel> diagnostics,
                                         StoryGraphNodeModel currentNode,
                                         string sourcePath,
                                         int lineNumber,
                                         string raw,
                                         string trimmed) {
            int bodyStart = FindMarkerBodyStart(raw, '?');
            int bodyContentStart = FindTrimmedBodyStart(raw, bodyStart);
            int openBracket = raw.IndexOf('[', bodyContentStart);
            int closeBracket = FindConditionClosingBracket(raw, openBracket);
            DslScriptConditionModel condition = new DslScriptConditionModel();

            if (closeBracket < 0) {
                diagnostics.Add(new DiagnosticModel("INS051",
                                               DiagnosticSeverityModel.Error,
                                               "Condition expression is missing a closing ']'.",
                                               sourcePath,
                                               lineNumber,
                                               openBracket + 1));
            } else {
                condition = ParseCondition(diagnostics, sourcePath, lineNumber, raw, openBracket, closeBracket);
            }

            int afterConditionStart = closeBracket < 0 ? raw.Length : closeBracket + 1;
            string afterCondition = raw.Substring(afterConditionStart).Trim();

            DslScriptConditionalJumpModel jump = new DslScriptConditionalJumpModel();
            jump.Condition = condition;
            jump.Source = new SourceSpanModel(sourcePath, lineNumber, FirstNonWhitespaceColumn(raw));

            if (!afterCondition.StartsWith("->", StringComparison.Ordinal)) {
                diagnostics.Add(new DiagnosticModel("INS060",
                                               DiagnosticSeverityModel.Error,
                                               "Conditional jump must include a target, for example '? [condition] -> target'.",
                                               sourcePath,
                                               lineNumber,
                                               afterConditionStart + 1));
                currentNode.ConditionalJumps.Add(jump);
                return;
            }

            int absoluteArrowIndex = afterConditionStart + raw.Substring(afterConditionStart).IndexOf("->", StringComparison.Ordinal);
            string target = afterCondition.Substring(2).Trim();
            jump.Target = target;

            if (target.Length == 0) {
                diagnostics.Add(new DiagnosticModel("INS060",
                                               DiagnosticSeverityModel.Error,
                                               "Conditional jump target is required after '->'.",
                                               sourcePath,
                                               lineNumber,
                                               absoluteArrowIndex + 3));
            } else if (!IsValidNodeReference(target)) {
                diagnostics.Add(new DiagnosticModel("INS010",
                                               DiagnosticSeverityModel.Error,
                                               "Invalid jump target '" + target + "'. Use a valid '# Title' target.",
                                               sourcePath,
                                               lineNumber,
                                               absoluteArrowIndex + 3));
            }

            currentNode.ConditionalJumps.Add(jump);

            if (jump.Target.Length > 0) {
                StoryGraphEdgeModel edge = new StoryGraphEdgeModel();
                edge.From = currentNode.Name;
                edge.To = jump.Target;
                edge.Kind = StoryGraphEdgeKindModel.Conditional;
                edge.Label = condition.Raw;
                edge.Source = jump.Source;
                edge.Condition = condition;
                document.Edges.Add(edge);
            }
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

        static bool IsConditionalJumpLine(string raw, string trimmed) {
            if (!trimmed.StartsWith("?", StringComparison.Ordinal)) {
                return false;
            }

            int bodyStart = FindMarkerBodyStart(raw, '?');
            int bodyContentStart = FindTrimmedBodyStart(raw, bodyStart);
            return bodyContentStart < raw.Length && raw[bodyContentStart] == '[';
        }

        static DslScriptConditionModel ParseCondition(List<DiagnosticModel> diagnostics,
                                                      string sourcePath,
                                                      int lineNumber,
                                                      string raw,
                                                      int openBracket,
                                                      int closeBracket) {
            string conditionRaw = raw.Substring(openBracket + 1, closeBracket - openBracket - 1);
            DslScriptConditionParserDomain parser = new DslScriptConditionParserDomain();
            return parser.Parse(conditionRaw, sourcePath, lineNumber, openBracket + 2, diagnostics);
        }

        static void ReportMissingConditionalFallback(List<DiagnosticModel> diagnostics,
                                                     ref ConditionalJumpFallbackState? pending) {
            if (pending == null) {
                return;
            }

            diagnostics.Add(new DiagnosticModel("INS061",
                                           DiagnosticSeverityModel.Error,
                                           "Conditional jump group must end with a fallback '-> target'.",
                                           pending.SourcePath,
                                           pending.Line,
                                           pending.Column));
            pending = null;
        }

        static int FindMarkerBodyStart(string raw, char marker) {
            int markerIndex = raw.IndexOf(marker);
            if (markerIndex < 0) {
                return raw.Length;
            }

            return markerIndex + 1;
        }

        static int FindTrimmedBodyStart(string raw, int bodyStart) {
            int offset = bodyStart;
            while (offset < raw.Length && char.IsWhiteSpace(raw[offset])) {
                offset += 1;
            }

            return offset;
        }

        static int FindConditionClosingBracket(string raw, int openBracket) {
            if (openBracket < 0) {
                return -1;
            }

            bool inString = false;
            int nestedSquareDepth = 0;
            for (int i = openBracket + 1; i < raw.Length; i += 1) {
                char current = raw[i];
                if (inString) {
                    if (current == '\\' && i + 1 < raw.Length) {
                        i += 1;
                        continue;
                    }

                    if (current == '"') {
                        inString = false;
                    }
                    continue;
                }

                if (current == '"') {
                    inString = true;
                    continue;
                }

                if (current == '[') {
                    nestedSquareDepth += 1;
                    continue;
                }

                if (current == ']') {
                    if (nestedSquareDepth == 0) {
                        return i;
                    }

                    nestedSquareDepth -= 1;
                }
            }

            return -1;
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

        sealed class ConditionalJumpFallbackState {

            public string SourcePath { get; }

            public int Line { get; }

            public int Column { get; }

            public ConditionalJumpFallbackState(string sourcePath, int line, int column) {
                SourcePath = sourcePath;
                Line = line;
                Column = column;
            }

        }

    }

}
