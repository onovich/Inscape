using System.Collections.Generic;
using Inscape.Compiler.Model;

namespace Inscape.Compiler.Localization {

    public sealed class LocalizationExtractorDomain {

        public List<LocalizationEntryModel> Extract(DslScriptDocumentModel document) {
            List<LocalizationEntryModel> entries = new List<LocalizationEntryModel>();

            for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                StoryGraphNodeModel node = document.Nodes[nodeIndex];
                ExtractLines(node, entries);
                ExtractChoices(node, entries);
            }

            return entries;
        }

        static void ExtractLines(StoryGraphNodeModel node, List<LocalizationEntryModel> entries) {
            for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                DslScriptLineModel line = node.Lines[lineIndex];
                if (line.Kind == DslScriptLineKindModel.Metadata || string.IsNullOrWhiteSpace(line.Text)) {
                    continue;
                }

                AddEntry(entries, line.Anchor, node.Name, line.Kind.ToString(), line.Speaker, line.Text, line.Source);
            }
        }

        static void ExtractChoices(StoryGraphNodeModel node, List<LocalizationEntryModel> entries) {
            for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                DslScriptChoiceGroupModel choice = node.Choices[choiceIndex];
                if (!string.IsNullOrWhiteSpace(choice.Prompt)) {
                    AddEntry(entries, choice.Anchor, node.Name, "ChoicePrompt", string.Empty, choice.Prompt, choice.Source);
                }

                for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                    DslScriptChoiceOptionModel option = choice.Options[optionIndex];
                    if (string.IsNullOrWhiteSpace(option.Text)) {
                        continue;
                    }

                    AddEntry(entries, option.Anchor, node.Name, "ChoiceOption", string.Empty, option.Text, option.Source);
                }
            }
        }

        static void AddEntry(List<LocalizationEntryModel> entries,
                             string anchor,
                             string nodeName,
                             string kind,
                             string speaker,
                             string text,
                             SourceSpanModel source) {
            if (string.IsNullOrWhiteSpace(anchor)) {
                return;
            }

            entries.Add(new LocalizationEntryModel {
                Anchor = anchor,
                NodeName = nodeName,
                Kind = kind,
                Speaker = speaker,
                Text = text,
                Source = source,
            });
        }

    }

}
