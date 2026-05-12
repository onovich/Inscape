using System.Text;

namespace Inscape.Tooling {

    public static class HostBindingMapReaderDomain {

        public static bool TryRead(string? bindingMapPath,
                                   out List<HostBindingMapEntryModel> entries,
                                   out string? errorMessage) {
            entries = new List<HostBindingMapEntryModel>();
            errorMessage = null;

            if (string.IsNullOrWhiteSpace(bindingMapPath)) {
                errorMessage = "Missing host binding map path.";
                return false;
            }

            if (!File.Exists(bindingMapPath)) {
                errorMessage = "Host binding map not found: " + bindingMapPath;
                return false;
            }

            string[] lines = File.ReadAllLines(bindingMapPath, Encoding.UTF8);
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) {
                    continue;
                }

                List<string> fields = ParseCsvRow(lines[i]);
                if (IsHeader(fields)) {
                    continue;
                }

                if (fields.Count != 6) {
                    errorMessage = "Invalid host binding map row at line " + (i + 1) + ": " + lines[i];
                    return false;
                }

                string kind = fields[0].Trim();
                string alias = fields[1].Trim();
                string targetIdText = fields[2].Trim();
                string unityGuid = fields[3].Trim();
                string addressableKey = fields[4].Trim();
                string assetPath = fields[5].Trim();

                if (kind.Length == 0 || alias.Length == 0) {
                    errorMessage = "Invalid host binding map row at line " + (i + 1) + ": kind and alias are required.";
                    return false;
                }

                int? targetId = null;
                if (targetIdText.Length > 0) {
                    if (!int.TryParse(targetIdText, out int parsedTargetId)) {
                        errorMessage = "Invalid host binding map row at line " + (i + 1) + ": target id must be an integer.";
                        return false;
                    }

                    targetId = parsedTargetId;
                }

                if (targetId == null
                    && unityGuid.Length == 0
                    && addressableKey.Length == 0
                    && assetPath.Length == 0) {
                    errorMessage = "Invalid host binding map row at line " + (i + 1) + ": at least one binding target is required.";
                    return false;
                }

                entries.Add(new HostBindingMapEntryModel {
                    Kind = kind,
                    Alias = alias,
                    TargetId = targetId,
                    UnityGuid = unityGuid,
                    AddressableKey = addressableKey,
                    AssetPath = assetPath,
                });
            }

            return true;
        }

        static bool IsHeader(List<string> fields) {
            return fields.Count == 6
                && fields[0].Equals("kind", StringComparison.OrdinalIgnoreCase)
                && fields[1].Equals("alias", StringComparison.OrdinalIgnoreCase)
                && fields[2].Equals("unitySampleId", StringComparison.OrdinalIgnoreCase)
                && fields[3].Equals("unityGuid", StringComparison.OrdinalIgnoreCase)
                && fields[4].Equals("addressableKey", StringComparison.OrdinalIgnoreCase)
                && fields[5].Equals("assetPath", StringComparison.OrdinalIgnoreCase);
        }

        static List<string> ParseCsvRow(string line) {
            List<string> fields = new List<string>();
            StringBuilder field = new StringBuilder();
            bool inQuotes = false;

            for (int i = 0; i < line.Length; i += 1) {
                char c = line[i];
                if (c == '"') {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"') {
                        field.Append('"');
                        i += 1;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (c == ',' && !inQuotes) {
                    fields.Add(field.ToString());
                    field.Clear();
                } else {
                    field.Append(c);
                }
            }

            fields.Add(field.ToString());
            return fields;
        }

    }

}