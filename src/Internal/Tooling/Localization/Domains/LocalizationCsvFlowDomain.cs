using System.Text;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class LocalizationCsvFlowDomain {

        public static string Extract(InscapeDocument document) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(extractor.Extract(document));
        }

        public static string Update(InscapeDocument document, IReadOnlyList<LocalizationEntry> previousEntries) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationMerger merger = new LocalizationMerger();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(merger.Merge(extractor.Extract(document), previousEntries), true);
        }

        public static bool TryReadPreviousEntries(string? previousLocalizationPath,
                                                  out List<LocalizationEntry> entries,
                                                  out string? errorMessage) {
            entries = new List<LocalizationEntry>();
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(previousLocalizationPath)) {
                errorMessage = "Missing required option: --from <old.csv>";
                return false;
            }

            if (!File.Exists(previousLocalizationPath)) {
                errorMessage = "Previous localization CSV not found: " + previousLocalizationPath;
                return false;
            }

            LocalizationCsvReader reader = new LocalizationCsvReader();
            entries = reader.Read(File.ReadAllText(previousLocalizationPath, Encoding.UTF8));
            return true;
        }

    }

}