using System.Collections.Generic;

namespace Inscape.Core.Localization {

    public sealed class LocalizationMerger {

        public List<LocalizationEntry> Merge(IReadOnlyList<LocalizationEntry> current,
                                             IReadOnlyList<LocalizationEntry> previous) {
            Dictionary<string, LocalizationEntry> previousByAnchor = new Dictionary<string, LocalizationEntry>(System.StringComparer.Ordinal);
            for (int i = 0; i < previous.Count; i += 1) {
                LocalizationEntry entry = previous[i];
                if (!string.IsNullOrWhiteSpace(entry.Anchor) && !previousByAnchor.ContainsKey(entry.Anchor)) {
                    previousByAnchor.Add(entry.Anchor, entry);
                }
            }

            HashSet<string> usedPreviousAnchors = new HashSet<string>(System.StringComparer.Ordinal);
            List<LocalizationEntry> merged = new List<LocalizationEntry>();

            for (int i = 0; i < current.Count; i += 1) {
                LocalizationEntry entry = Copy(current[i]);
                if (previousByAnchor.TryGetValue(entry.Anchor, out LocalizationEntry? previousEntry)) {
                    entry.Translation = previousEntry.Translation;
                    entry.Status = "current";
                    usedPreviousAnchors.Add(entry.Anchor);
                } else {
                    entry.Status = "new";
                }
                merged.Add(entry);
            }

            for (int i = 0; i < previous.Count; i += 1) {
                LocalizationEntry entry = previous[i];
                if (string.IsNullOrWhiteSpace(entry.Anchor) || usedPreviousAnchors.Contains(entry.Anchor)) {
                    continue;
                }

                LocalizationEntry removed = Copy(entry);
                removed.Status = "removed";
                merged.Add(removed);
                usedPreviousAnchors.Add(entry.Anchor);
            }

            return merged;
        }

        static LocalizationEntry Copy(LocalizationEntry entry) {
            return new LocalizationEntry {
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
