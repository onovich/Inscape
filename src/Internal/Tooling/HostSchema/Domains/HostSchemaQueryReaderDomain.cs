using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaQueryReaderDomain {

        public static HostSchemaQueryReadResultModel Read(string? hostSchemaPath, JsonSerializerOptions jsonOptions) {
            HostSchemaQueryReadResultModel result = new HostSchemaQueryReadResultModel {
                ConfiguredPath = hostSchemaPath,
                ResolvedPath = hostSchemaPath,
            };

            if (string.IsNullOrWhiteSpace(hostSchemaPath)) {
                return result;
            }

            if (!File.Exists(hostSchemaPath)) {
                result.ErrorMessage = "Host Schema not found: " + hostSchemaPath;
                return result;
            }

            try {
                string text = File.ReadAllText(hostSchemaPath, Encoding.UTF8);
                HostSchemaQueryDocumentModel? parsed = JsonSerializer.Deserialize<HostSchemaQueryDocumentModel>(text, jsonOptions);
                result.Loaded = true;
                result.Queries = NormalizeQueries(parsed, hostSchemaPath, text);
                return result;
            } catch (Exception ex) {
                result.ErrorMessage = "Invalid Host Schema '" + hostSchemaPath + "': " + ex.Message;
                return result;
            }
        }

        static List<HostSchemaQueryCapabilityModel> NormalizeQueries(HostSchemaQueryDocumentModel? document,
                                                                     string sourcePath,
                                                                     string text) {
            List<HostSchemaQueryCapabilityModel> queries = new List<HostSchemaQueryCapabilityModel>();
            if (document == null || document.Queries == null) {
                return queries;
            }

            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < document.Queries.Count; i += 1) {
                HostSchemaQueryCapabilityModel query = document.Queries[i];
                string name = (query.Name ?? string.Empty).Trim();
                if (name.Length == 0 || seen.Contains(name)) {
                    continue;
                }

                seen.Add(name);
                SourceLocation location = FindQueryLocation(text, name);
                query.Name = name;
                query.ReturnType = query.ReturnType ?? string.Empty;
                query.Description = query.Description ?? string.Empty;
                query.Parameters = query.Parameters ?? new List<HostSchemaParameterModel>();
                query.SourcePath = sourcePath;
                query.Line = location.Line;
                query.Column = location.Column;
                query.Length = Math.Max(name.Length, 1);
                queries.Add(query);
            }

            return queries;
        }

        static SourceLocation FindQueryLocation(string text, string queryName) {
            string[] lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            bool inQueries = false;
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i];
                if (!inQueries && line.Contains("\"queries\"")) {
                    inQueries = true;
                    continue;
                }

                if (inQueries && (line.Contains("\"actions\"") || line.Contains("\"events\""))) {
                    break;
                }

                if (!inQueries) {
                    continue;
                }

                int nameIndex = line.IndexOf("\"name\"", StringComparison.Ordinal);
                if (nameIndex < 0) {
                    continue;
                }

                int valueIndex = line.IndexOf("\"" + queryName + "\"", nameIndex, StringComparison.Ordinal);
                if (valueIndex >= 0) {
                    return new SourceLocation(i + 1, valueIndex + 2);
                }
            }

            return new SourceLocation(1, 1);
        }

        sealed class HostSchemaQueryDocumentModel {

            public List<HostSchemaQueryCapabilityModel> Queries { get; set; } = new List<HostSchemaQueryCapabilityModel>();

        }

        readonly struct SourceLocation {

            public int Line { get; }

            public int Column { get; }

            public SourceLocation(int line, int column) {
                Line = line;
                Column = column;
            }
        }

    }

}
