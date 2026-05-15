using System.Collections.Generic;

namespace Inscape.Compiler.Localization {

    public sealed class LocalizationMergerDomain {

        public List<LocalizationEntryModel> Merge(IReadOnlyList<LocalizationEntryModel> current,
                                             IReadOnlyList<LocalizationEntryModel> previous) {
            Dictionary<string, LocalizationEntryModel> previousByAnchor = new Dictionary<string, LocalizationEntryModel>(System.StringComparer.Ordinal);
            for (int i = 0; i < previous.Count; i += 1) {
                LocalizationEntryModel entry = previous[i];
                if (!string.IsNullOrWhiteSpace(entry.Anchor) && !previousByAnchor.ContainsKey(entry.Anchor)) {
                    previousByAnchor.Add(entry.Anchor, entry);
                }
            }

            HashSet<string> usedPreviousAnchors = new HashSet<string>(System.StringComparer.Ordinal);
            List<LocalizationEntryModel> merged = new List<LocalizationEntryModel>();

            for (int i = 0; i < current.Count; i += 1) {
                LocalizationEntryModel entry = Copy(current[i]);
                if (previousByAnchor.TryGetValue(entry.Anchor, out LocalizationEntryModel? previousEntry)) {
                    entry.Translation = previousEntry.Translation;
                    entry.Status = "current";
                    usedPreviousAnchors.Add(entry.Anchor);
                } else {
                    entry.Status = "new";
                }
                merged.Add(entry);
            }

            for (int i = 0; i < previous.Count; i += 1) {
                LocalizationEntryModel entry = previous[i];
                if (string.IsNullOrWhiteSpace(entry.Anchor) || usedPreviousAnchors.Contains(entry.Anchor)) {
                    continue;
                }

                LocalizationEntryModel removed = Copy(entry);
                removed.Status = "removed";
                merged.Add(removed);
                usedPreviousAnchors.Add(entry.Anchor);
            }

            return merged;
        }

        static LocalizationEntryModel Copy(LocalizationEntryModel entry) {
            return new LocalizationEntryModel {
                Anchor = entry.Anchor,
                NodeName = entry.NodeName,
                Kind = entry.Kind,
                Speaker = entry.Speaker,
                Text = entry.Text,
                Translation = entry.Translation,
                Status = entry.Status,
                Source = entry.Source,
            };
        }

    }

}
