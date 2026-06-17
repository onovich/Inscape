using System.Text;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class LocalizationCsvFlowDomain {

        public static string Extract(DslScriptDocumentModel document) {
            LocalizationExtractorDomain extractor = new LocalizationExtractorDomain();
            LocalizationCsvWriterDomain writer = new LocalizationCsvWriterDomain();
            return writer.Write(extractor.Extract(document));
        }

        public static string Update(DslScriptDocumentModel document, IReadOnlyList<LocalizationEntryModel> previousEntries) {
            LocalizationExtractorDomain extractor = new LocalizationExtractorDomain();
            LocalizationMergerDomain merger = new LocalizationMergerDomain();
            LocalizationCsvWriterDomain writer = new LocalizationCsvWriterDomain();
            return writer.Write(merger.Merge(extractor.Extract(document), previousEntries), true);
        }

        public static List<LocalizationEntryModel> ApplyTranslationOverrides(IReadOnlyList<LocalizationEntryModel> previousEntries,
                                                                             IReadOnlyList<LocalizationTranslationOverrideModel> overrides) {
            Dictionary<string, string> translationsByAnchor = new Dictionary<string, string>(System.StringComparer.Ordinal);
            for (int i = 0; i < overrides.Count; i += 1) {
                LocalizationTranslationOverrideModel item = overrides[i];
                if (string.IsNullOrWhiteSpace(item.Anchor)) {
                    continue;
                }

                translationsByAnchor[item.Anchor] = item.Translation ?? string.Empty;
            }

            List<LocalizationEntryModel> entries = new List<LocalizationEntryModel>();
            for (int i = 0; i < previousEntries.Count; i += 1) {
                LocalizationEntryModel entry = Copy(previousEntries[i]);
                if (translationsByAnchor.TryGetValue(entry.Anchor, out string? translation)) {
                    entry.Translation = translation;
                }

                entries.Add(entry);
            }

            return entries;
        }

        public static bool TryReadPreviousEntries(string? previousLocalizationPath,
                                                  out List<LocalizationEntryModel> entries,
                                                  out string? errorMessage) {
            entries = new List<LocalizationEntryModel>();
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(previousLocalizationPath)) {
                errorMessage = "Missing required option: --from <old.csv>";
                return false;
            }

            if (!File.Exists(previousLocalizationPath)) {
                errorMessage = "Previous localization CSV not found: " + previousLocalizationPath;
                return false;
            }

            string csv = File.ReadAllText(previousLocalizationPath, Encoding.UTF8);
            if (!LooksLikeLocalizationCsv(csv)) {
                errorMessage = "Previous localization CSV must include anchor and translation columns: " + previousLocalizationPath;
                return false;
            }

            LocalizationCsvReaderDomain reader = new LocalizationCsvReaderDomain();
            entries = reader.Read(csv);
            return true;
        }

        static bool LooksLikeLocalizationCsv(string csv) {
            string[] lines = csv.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0) {
                    continue;
                }

                bool hasAnchor = false;
                bool hasTranslation = false;
                string[] columns = line.Split(',');
                for (int columnIndex = 0; columnIndex < columns.Length; columnIndex += 1) {
                    string column = columns[columnIndex].Trim().Trim('"');
                    if (string.Equals(column, "anchor", System.StringComparison.OrdinalIgnoreCase)) {
                        hasAnchor = true;
                    }

                    if (string.Equals(column, "translation", System.StringComparison.OrdinalIgnoreCase)) {
                        hasTranslation = true;
                    }
                }

                return hasAnchor && hasTranslation;
            }

            return false;
        }

        static LocalizationEntryModel Copy(LocalizationEntryModel entry) {
            return new LocalizationEntryModel {
                Anchor = entry.Anchor,
                Kind = entry.Kind,
                NodeName = entry.NodeName,
                Source = new SourceSpanModel(entry.Source.SourcePath, entry.Source.Line, entry.Source.Column),
                Speaker = entry.Speaker,
                Status = entry.Status,
                Text = entry.Text,
                Translation = entry.Translation,
            };
        }

    }

}
