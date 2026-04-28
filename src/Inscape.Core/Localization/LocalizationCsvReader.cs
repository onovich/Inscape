using System.Collections.Generic;
using System.Globalization;
using System.Text;
using Inscape.Core.Model;

namespace Inscape.Core.Localization {

    public sealed class LocalizationCsvReader {

        public List<LocalizationEntry> Read(string csv) {
            List<List<string>> records = ParseRecords(csv);
            List<LocalizationEntry> entries = new List<LocalizationEntry>();
            if (records.Count == 0) {
                return entries;
            }

            Dictionary<string, int> header = CreateHeaderMap(records[0]);
            for (int i = 1; i < records.Count; i += 1) {
                List<string> row = records[i];
                string anchor = Get(row, header, "anchor");
                if (string.IsNullOrWhiteSpace(anchor)) {
                    continue;
                }

                entries.Add(new LocalizationEntry {
                    Anchor = anchor,
                    NodeName = Get(row, header, "node"),
                    Kind = Get(row, header, "kind"),
                    Speaker = Get(row, header, "speaker"),
                    Text = Get(row, header, "text"),
                    Translation = Get(row, header, "translation"),
                    Status = Get(row, header, "status"),
                    Source = new SourceSpan(Get(row, header, "sourcePath"),
                                            ParseInt(Get(row, header, "line")),
                                            ParseInt(Get(row, header, "column"))),
                });
            }

            return entries;
        }

        static Dictionary<string, int> CreateHeaderMap(List<string> header) {
            Dictionary<string, int> map = new Dictionary<string, int>(System.StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < header.Count; i += 1) {
                string name = header[i].Trim();
                if (!map.ContainsKey(name)) {
                    map.Add(name, i);
                }
            }
            return map;
        }

        static string Get(List<string> row, Dictionary<string, int> header, string name) {
            if (!header.TryGetValue(name, out int index) || index < 0 || index >= row.Count) {
                return string.Empty;
            }
            return row[index];
        }

        static int ParseInt(string value) {
            if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int parsed)) {
                return parsed;
            }
            return 0;
        }

        static List<List<string>> ParseRecords(string csv) {
            List<List<string>> records = new List<List<string>>();
            List<string> row = new List<string>();
            StringBuilder field = new StringBuilder();
            bool inQuotes = false;
            bool sawAnyCharacter = false;

            for (int i = 0; i < csv.Length; i += 1) {
                char c = csv[i];
                sawAnyCharacter = true;

                if (inQuotes) {
                    if (c == '"') {
                        if (i + 1 < csv.Length && csv[i + 1] == '"') {
                            field.Append('"');
                            i += 1;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        field.Append(c);
                    }
                    continue;
                }

                if (c == '"') {
                    inQuotes = true;
                    continue;
                }

                if (c == ',') {
                    row.Add(field.ToString());
                    field.Length = 0;
                    continue;
                }

                if (c == '\r' || c == '\n') {
                    if (c == '\r' && i + 1 < csv.Length && csv[i + 1] == '\n') {
                        i += 1;
                    }
                    EndRecord(records, row, field);
                    row = new List<string>();
                    field = new StringBuilder();
                    continue;
                }

                field.Append(c);
            }

            if (sawAnyCharacter && (field.Length > 0 || row.Count > 0)) {
                EndRecord(records, row, field);
            }

            return records;
        }

        static void EndRecord(List<List<string>> records, List<string> row, StringBuilder field) {
            row.Add(field.ToString());
            if (row.Count == 1 && row[0].Length == 0) {
                return;
            }
            records.Add(row);
        }

    }

}
