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

            LocalizationCsvReaderDomain reader = new LocalizationCsvReaderDomain();
            entries = reader.Read(File.ReadAllText(previousLocalizationPath, Encoding.UTF8));
            return true;
        }

    }

}