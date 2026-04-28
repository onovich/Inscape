using System.Collections.Generic;
using Inscape.Core.Diagnostics;
using Inscape.Core.Model;

namespace Inscape.Core.Analysis {

    public sealed class AnchorValidator {

        public void Validate(InscapeDocument document, List<Diagnostic> diagnostics) {
            Dictionary<string, SourceSpan> anchors = new Dictionary<string, SourceSpan>(System.StringComparer.Ordinal);

            for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = document.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    AddAnchor(line.Anchor, line.Source, anchors, diagnostics);
                }

                for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                    ChoiceGroup choice = node.Choices[choiceIndex];
                    for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                        ChoiceOption option = choice.Options[optionIndex];
                        AddAnchor(option.Anchor, option.Source, anchors, diagnostics);
                    }
                }
            }
        }

        static void AddAnchor(string anchor,
                              SourceSpan source,
                              Dictionary<string, SourceSpan> anchors,
                              List<Diagnostic> diagnostics) {
            if (string.IsNullOrEmpty(anchor)) {
                return;
            }

            if (!anchors.TryGetValue(anchor, out SourceSpan previous)) {
                anchors.Add(anchor, source);
                return;
            }

            if (previous.SourcePath == source.SourcePath
                && previous.Line == source.Line
                && previous.Column == source.Column) {
                return;
            }

            diagnostics.Add(new Diagnostic("INS040",
                                           DiagnosticSeverity.Error,
                                           "Anchor collision '" + anchor + "' is already used at "
                                           + previous.SourcePath + "(" + previous.Line + "," + previous.Column + ").",
                                           source.SourcePath,
                                           source.Line,
                                           source.Column));
        }

    }

}
