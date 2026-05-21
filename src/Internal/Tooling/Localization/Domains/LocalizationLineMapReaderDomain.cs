using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class LocalizationLineMapReaderDomain {

        public static bool TryRead(string path,
                                   JsonSerializerOptions jsonOptions,
                                   out LocalizationLineMapModel map,
                                   out string? errorMessage) {
            map = new LocalizationLineMapModel();
            errorMessage = null;

            string fullPath = Path.GetFullPath(path);
            if (!File.Exists(fullPath)) {
                return true;
            }

            try {
                LocalizationLineMapModel? parsed = JsonSerializer.Deserialize<LocalizationLineMapModel>(File.ReadAllText(fullPath, Encoding.UTF8), jsonOptions);
                map = Normalize(parsed ?? new LocalizationLineMapModel());
                if (map.Format != "inscape.localization-line-map") {
                    errorMessage = "Invalid localization line map format in '" + fullPath + "': expected 'inscape.localization-line-map'.";
                    return false;
                }

                if (map.FormatVersion != 1) {
                    errorMessage = "Unsupported localization line map formatVersion in '" + fullPath + "': " + map.FormatVersion + ".";
                    return false;
                }

                return true;
            } catch (Exception ex) {
                errorMessage = "Invalid localization line map '" + fullPath + "': " + ex.Message;
                return false;
            }
        }

        static LocalizationLineMapModel Normalize(LocalizationLineMapModel map) {
            map.Format = string.IsNullOrWhiteSpace(map.Format) ? "inscape.localization-line-map" : map.Format;
            map.FormatVersion = map.FormatVersion == 0 ? 1 : map.FormatVersion;
            map.LastRefreshedAt ??= string.Empty;
            map.LastSourceFingerprint ??= string.Empty;
            map.Documents ??= new List<LocalizationLineMapDocumentModel>();

            for (int i = 0; i < map.Documents.Count; i += 1) {
                LocalizationLineMapDocumentModel document = map.Documents[i];
                document.SourcePath ??= string.Empty;
                document.Blocks ??= new List<LocalizationLineMapBlockModel>();
                for (int blockIndex = 0; blockIndex < document.Blocks.Count; blockIndex += 1) {
                    LocalizationLineMapBlockModel block = document.Blocks[blockIndex];
                    block.BlockId ??= string.Empty;
                    block.BlockTitle ??= string.Empty;
                    block.Lines ??= new List<LocalizationLineMapEntryModel>();
                    for (int lineIndex = 0; lineIndex < block.Lines.Count; lineIndex += 1) {
                        LocalizationLineMapEntryModel line = block.Lines[lineIndex];
                        line.LineId ??= string.Empty;
                        line.Kind ??= string.Empty;
                        line.Speaker ??= string.Empty;
                        line.Text ??= string.Empty;
                        line.Fingerprint ??= string.Empty;
                    }
                }
            }

            return map;
        }

    }

}
