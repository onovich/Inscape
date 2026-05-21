using System.Text.Json;

namespace Inscape.Tooling {

    public static class LocalizationLineMapWriterDomain {

        public static void Write(string path, LocalizationLineMapModel map, JsonSerializerOptions jsonOptions) {
            string fullPath = Path.GetFullPath(path);
            WriteWithBackup(fullPath, map, jsonOptions);
        }

        public static void WriteWithBackup(string fullPath, LocalizationLineMapModel map, JsonSerializerOptions jsonOptions) {
            string? directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrWhiteSpace(directory)) {
                Directory.CreateDirectory(directory);
            }

            map.LastRefreshedAt = DateTimeOffset.UtcNow.ToString("O", System.Globalization.CultureInfo.InvariantCulture);
            string backupPath = fullPath + ".backup";
            if (File.Exists(fullPath)) {
                File.Copy(fullPath, backupPath, true);
            }

            File.WriteAllText(fullPath, JsonSerializer.Serialize(map, jsonOptions));
        }

        public static bool TryRestoreBackup(string path) {
            string fullPath = Path.GetFullPath(path);
            string backupPath = fullPath + ".backup";
            if (!File.Exists(backupPath)) {
                return false;
            }

            File.Copy(backupPath, fullPath, true);
            return true;
        }

    }

}
