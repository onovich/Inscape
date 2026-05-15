using System.Collections.Generic;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Analysis {

    public sealed class StoryGraphAnchorValidatorDomain {

        public void Validate(DslScriptDocumentModel document, List<DiagnosticModel> diagnostics) {
            Dictionary<string, SourceSpanModel> anchors = new Dictionary<string, SourceSpanModel>(System.StringComparer.Ordinal);

            for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                StoryGraphNodeModel node = document.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    DslScriptLineModel line = node.Lines[lineIndex];
                    AddAnchor(line.Anchor, line.Source, anchors, diagnostics);
                }

                for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                    DslScriptChoiceGroupModel choice = node.Choices[choiceIndex];
                    AddAnchor(choice.Anchor, choice.Source, anchors, diagnostics);
                    for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                        DslScriptChoiceOptionModel option = choice.Options[optionIndex];
                        AddAnchor(option.Anchor, option.Source, anchors, diagnostics);
                    }
                }
            }
        }

        static void AddAnchor(string anchor,
                              SourceSpanModel source,
                              Dictionary<string, SourceSpanModel> anchors,
                              List<DiagnosticModel> diagnostics) {
            if (string.IsNullOrEmpty(anchor)) {
                return;
            }

            if (!anchors.TryGetValue(anchor, out SourceSpanModel previous)) {
                anchors.Add(anchor, source);
                return;
            }

            if (previous.SourcePath == source.SourcePath
                && previous.Line == source.Line
                && previous.Column == source.Column) {
                return;
            }

            diagnostics.Add(new DiagnosticModel("INS040",
                                           DiagnosticSeverityModel.Error,
                                           "Anchor collision '" + anchor + "' is already used at "
                                           + previous.SourcePath + "(" + previous.Line + "," + previous.Column + ").",
                                           source.SourcePath,
                                           source.Line,
                                           source.Column));
        }

    }

}
