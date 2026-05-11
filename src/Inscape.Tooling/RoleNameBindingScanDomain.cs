using System.Text;

namespace Inscape.Tooling {

    public static class RoleNameBindingScanDomain {

        public static bool TryRead(string? roleNameCsvPath,
                                   out RoleNameBindingScanResultModel result,
                                   out string? errorMessage) {
            result = new RoleNameBindingScanResultModel();
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(roleNameCsvPath)) {
                return true;
            }

            if (!File.Exists(roleNameCsvPath)) {
                errorMessage = "Role name CSV not found: " + roleNameCsvPath;
                return false;
            }

            string[] lines = File.ReadAllLines(roleNameCsvPath, Encoding.UTF8);
            if (lines.Length == 0) {
                return true;
            }

            result.ScannedRoleNameCsv = true;
            List<string> headers = ParseCsvRow(lines[0]);
            List<int> textColumns = new List<int>();
            for (int i = 0; i < headers.Count; i += 1) {
                string header = headers[i].Trim();
                if (header.Length == 0
                    || header.Equals("ID", StringComparison.OrdinalIgnoreCase)
                    || header.Equals("Desc", StringComparison.OrdinalIgnoreCase)) {
                    continue;
                }

                textColumns.Add(i);
            }

            HashSet<string> ambiguousSpeakers = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 1; i < lines.Length; i += 1) {
                if (string.IsNullOrWhiteSpace(lines[i])) {
                    continue;
                }

                List<string> fields = ParseCsvRow(lines[i]);
                if (fields.Count == 0 || !int.TryParse(fields[0].Trim(), out int roleId)) {
                    continue;
                }

                string description = fields.Count > 1 ? fields[1].Trim() : string.Empty;
                for (int columnIndex = 0; columnIndex < textColumns.Count; columnIndex += 1) {
                    int column = textColumns[columnIndex];
                    if (column >= fields.Count) {
                        continue;
                    }

                    string speaker = fields[column].Trim();
                    if (speaker.Length == 0 || ambiguousSpeakers.Contains(speaker)) {
                        continue;
                    }

                    AddCandidate(result.CandidatesBySpeaker,
                                 speaker,
                                 new RoleNameBindingCandidateModel {
                                     RoleId = roleId,
                                     Description = description,
                                     Language = headers[column].Trim(),
                                 });

                    if (result.RoleIdsBySpeaker.TryGetValue(speaker, out int existingRoleId)) {
                        if (existingRoleId != roleId) {
                            result.RoleIdsBySpeaker.Remove(speaker);
                            ambiguousSpeakers.Add(speaker);
                        }
                    } else {
                        result.RoleIdsBySpeaker.Add(speaker, roleId);
                    }
                }
            }

            return true;
        }

        static void AddCandidate(Dictionary<string, List<RoleNameBindingCandidateModel>> candidatesBySpeaker,
                                 string speaker,
                                 RoleNameBindingCandidateModel candidate) {
            if (!candidatesBySpeaker.TryGetValue(speaker, out List<RoleNameBindingCandidateModel>? candidates)) {
                candidates = new List<RoleNameBindingCandidateModel>();
                candidatesBySpeaker.Add(speaker, candidates);
            }

            for (int i = 0; i < candidates.Count; i += 1) {
                if (candidates[i].RoleId == candidate.RoleId && candidates[i].Language == candidate.Language) {
                    return;
                }
            }

            candidates.Add(candidate);
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