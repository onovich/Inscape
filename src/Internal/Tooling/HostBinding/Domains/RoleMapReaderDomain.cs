namespace Inscape.Tooling {

    public static class RoleMapReaderDomain {

        public static bool TryRead(string? roleMapPath,
                                   out Dictionary<string, int> roleIdsBySpeaker,
                                   out string? errorMessage) {
            roleIdsBySpeaker = new Dictionary<string, int>(StringComparer.Ordinal);
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(roleMapPath)) {
                return true;
            }

            if (!File.Exists(roleMapPath)) {
                errorMessage = "Role map not found: " + roleMapPath;
                return false;
            }

            string[] lines = File.ReadAllLines(roleMapPath);
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) {
                    continue;
                }

                if (i == 0 && line.Equals("speaker,roleId", StringComparison.OrdinalIgnoreCase)) {
                    continue;
                }

                int commaIndex = line.LastIndexOf(',');
                if (commaIndex <= 0 || commaIndex == line.Length - 1) {
                    errorMessage = "Invalid role map row at line " + (i + 1) + ": " + lines[i];
                    return false;
                }

                string speaker = UnquoteCsvField(line.Substring(0, commaIndex).Trim());
                string roleIdText = UnquoteCsvField(line.Substring(commaIndex + 1).Trim());
                if (speaker.Length == 0 || !int.TryParse(roleIdText, out int roleId)) {
                    errorMessage = "Invalid role map row at line " + (i + 1) + ": " + lines[i];
                    return false;
                }

                roleIdsBySpeaker[speaker] = roleId;
            }

            return true;
        }

        static string UnquoteCsvField(string value) {
            if (value.Length >= 2 && value[0] == '"' && value[value.Length - 1] == '"') {
                return value.Substring(1, value.Length - 2).Replace("\"\"", "\"");
            }

            return value;
        }

    }

}