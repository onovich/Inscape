using System.Collections.Generic;
using Inscape.Core.Model;

namespace Inscape.Core.Localization {

    public sealed class LocalizationExtractor {

        public List<LocalizationEntry> Extract(InscapeDocument document) {
            List<LocalizationEntry> entries = new List<LocalizationEntry>();

            for (int nodeIndex = 0; nodeIndex < document.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = document.Nodes[nodeIndex];
                ExtractLines(node, entries);
                ExtractChoices(node, entries);
            }

            return entries;
        }

        static void ExtractLines(NarrativeNode node, List<LocalizationEntry> entries) {
            for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                NarrativeLine line = node.Lines[lineIndex];
                if (line.Kind == NarrativeLineKind.Metadata || string.IsNullOrWhiteSpace(line.Text)) {
                    continue;
                }

                AddEntry(entries, line.Anchor, node.Name, line.Kind.ToString(), line.Speaker, line.Text, line.Source);
            }
        }

        static void ExtractChoices(NarrativeNode node, List<LocalizationEntry> entries) {
            for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                ChoiceGroup choice = node.Choices[choiceIndex];
                if (!string.IsNullOrWhiteSpace(choice.Prompt)) {
                    AddEntry(entries, choice.Anchor, node.Name, "ChoicePrompt", string.Empty, choice.Prompt, choice.Source);
                }

                for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                    ChoiceOption option = choice.Options[optionIndex];
                    if (string.IsNullOrWhiteSpace(option.Text)) {
                        continue;
                    }

                    AddEntry(entries, option.Anchor, node.Name, "ChoiceOption", string.Empty, option.Text, option.Source);
                }
            }
        }

        static void AddEntry(List<LocalizationEntry> entries,
                             string anchor,
                             string nodeName,
                             string kind,
                             string speaker,
                             string text,
                             SourceSpan source) {
            if (string.IsNullOrWhiteSpace(anchor)) {
                return;
            }

            entries.Add(new LocalizationEntry {
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
