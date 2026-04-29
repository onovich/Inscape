using System;
using System.Collections.Generic;
using System.Text;

namespace Inscape.Core.Bird {

    public sealed class BirdL10nMergePlanner {

        public BirdL10nMergeResult Merge(string existingCsv, string generatedCsv) {
            Table existing = Table.Parse(existingCsv);
            Table generated = Table.Parse(generatedCsv);
            if (!existing.Header.Contains("ID")) {
                throw new InvalidOperationException("Existing Bird L10N CSV must contain an ID column.");
            }
            if (!generated.Header.Contains("ID")) {
                throw new InvalidOperationException("Generated Bird L10N CSV must contain an ID column.");
            }
            if (generated.Header.Count < 2) {
                throw new InvalidOperationException("Generated Bird L10N CSV must contain at least one language column.");
            }

            List<string> mergedHeader = MergeHeaders(existing.Header, generated.Header);
            string sourceColumn = generated.Header[1];
            List<RowPlan> plans = CreatePlans(existing, generated, sourceColumn, mergedHeader);
            return new BirdL10nMergeResult(WriteMergedCsv(mergedHeader, plans),
                                           WriteReportCsv(mergedHeader, plans));
        }

        static List<RowPlan> CreatePlans(Table existing, Table generated, string sourceColumn, IReadOnlyList<string> mergedHeader) {
            Dictionary<string, Row> generatedById = generated.RowsById();
            HashSet<string> plannedIds = new HashSet<string>(StringComparer.Ordinal);
            List<RowPlan> plans = new List<RowPlan>();

            for (int i = 0; i < existing.Rows.Count; i += 1) {
                Row existingRow = existing.Rows[i];
                string id = existingRow.Id;
                if (string.IsNullOrWhiteSpace(id)) {
                    continue;
                }

                if (!generatedById.TryGetValue(id, out Row? generatedRow)) {
                    plans.Add(new RowPlan("retained", id, "existing row is outside current Inscape export", existingRow, existingRow, mergedHeader));
                    continue;
                }

                plannedIds.Add(id);
                string existingSource = existingRow.Get(sourceColumn);
                string generatedSource = generatedRow.Get(sourceColumn);
                if (existingSource == generatedSource) {
                    plans.Add(new RowPlan("unchanged", id, "source text unchanged; translations preserved", existingRow, existingRow, mergedHeader));
                } else {
                    Row merged = new Row(mergedHeader);
                    merged.Set("ID", id);
                    for (int columnIndex = 1; columnIndex < mergedHeader.Count; columnIndex += 1) {
                        string column = mergedHeader[columnIndex];
                        if (column == sourceColumn) {
                            merged.Set(column, generatedSource);
                        } else {
                            merged.Set(column, string.Empty);
                        }
                    }
                    plans.Add(new RowPlan("changed", id, "source text changed; target language cells cleared", existingRow, merged, mergedHeader));
                }
            }

            for (int i = 0; i < generated.Rows.Count; i += 1) {
                Row generatedRow = generated.Rows[i];
                string id = generatedRow.Id;
                if (string.IsNullOrWhiteSpace(id) || plannedIds.Contains(id)) {
                    continue;
                }

                Row merged = new Row(mergedHeader);
                merged.Set("ID", id);
                for (int columnIndex = 1; columnIndex < mergedHeader.Count; columnIndex += 1) {
                    string column = mergedHeader[columnIndex];
                    merged.Set(column, generatedRow.Get(column));
                }
                plans.Add(new RowPlan("added", id, "new Inscape row", null, merged, mergedHeader));
            }

            return plans;
        }

        static List<string> MergeHeaders(IReadOnlyList<string> existingHeader, IReadOnlyList<string> generatedHeader) {
            List<string> result = new List<string>();
            HashSet<string> seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            AddHeader(result, seen, "ID");
            for (int i = 0; i < existingHeader.Count; i += 1) {
                AddHeader(result, seen, existingHeader[i]);
            }
            for (int i = 0; i < generatedHeader.Count; i += 1) {
                AddHeader(result, seen, generatedHeader[i]);
            }
            return result;
        }

        static void AddHeader(List<string> result, HashSet<string> seen, string header) {
            string normalized = header.Trim();
            if (normalized.Length == 0 || seen.Contains(normalized)) {
                return;
            }

            result.Add(normalized);
            seen.Add(normalized);
        }

        static string WriteMergedCsv(IReadOnlyList<string> header, IReadOnlyList<RowPlan> plans) {
            StringBuilder builder = new StringBuilder();
            AppendRow(builder, header);
            for (int i = 0; i < plans.Count; i += 1) {
                List<string> fields = new List<string>();
                for (int columnIndex = 0; columnIndex < header.Count; columnIndex += 1) {
                    fields.Add(plans[i].Merged.Get(header[columnIndex]));
                }
                AppendRow(builder, fields);
            }
            return builder.ToString();
        }

        static string WriteReportCsv(IReadOnlyList<string> mergedHeader, IReadOnlyList<RowPlan> plans) {
            List<string> header = new List<string> { "status", "ID", "reason" };
            for (int i = 1; i < mergedHeader.Count; i += 1) {
                header.Add("old_" + mergedHeader[i]);
                header.Add("new_" + mergedHeader[i]);
            }

            StringBuilder builder = new StringBuilder();
            AppendRow(builder, header);
            for (int i = 0; i < plans.Count; i += 1) {
                RowPlan plan = plans[i];
                if (plan.Status == "retained" || plan.Status == "unchanged") {
                    continue;
                }

                List<string> fields = new List<string> { plan.Status, plan.Id, plan.Reason };
                for (int columnIndex = 1; columnIndex < mergedHeader.Count; columnIndex += 1) {
                    string column = mergedHeader[columnIndex];
                    fields.Add(plan.Old == null ? string.Empty : plan.Old.Get(column));
                    fields.Add(plan.Merged.Get(column));
                }
                AppendRow(builder, fields);
            }
            return builder.ToString();
        }

        static void AppendRow(StringBuilder builder, IReadOnlyList<string> fields) {
            for (int i = 0; i < fields.Count; i += 1) {
                if (i > 0) {
                    builder.Append(',');
                }
                AppendCsvField(builder, fields[i]);
            }
            builder.AppendLine();
        }

        static void AppendCsvField(StringBuilder builder, string value) {
            bool needsQuotes = value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0;
            if (!needsQuotes) {
                builder.Append(value);
                return;
            }

            builder.Append('"');
            for (int i = 0; i < value.Length; i += 1) {
                char c = value[i];
                if (c == '"') {
                    builder.Append("\"\"");
                } else {
                    builder.Append(c);
                }
            }
            builder.Append('"');
        }

        sealed class RowPlan {

            public string Status { get; }

            public string Id { get; }

            public string Reason { get; }

            public Row? Old { get; }

            public Row Merged { get; }

            public RowPlan(string status, string id, string reason, Row? old, Row merged, IReadOnlyList<string> mergedHeader) {
                Status = status;
                Id = id;
                Reason = reason;
                Old = old;
                Merged = merged.WithHeader(mergedHeader);
            }

        }

        sealed class Table {

            public List<string> Header { get; }

            public List<Row> Rows { get; }

            Table(List<string> header, List<Row> rows) {
                Header = header;
                Rows = rows;
            }

            public static Table Parse(string csv) {
                List<List<string>> records = ParseRecords(csv);
                if (records.Count == 0) {
                    return new Table(new List<string>(), new List<Row>());
                }

                List<string> header = new List<string>();
                for (int i = 0; i < records[0].Count; i += 1) {
                    header.Add(records[0][i].Trim());
                }

                List<Row> rows = new List<Row>();
                for (int i = 1; i < records.Count; i += 1) {
                    Row row = new Row(header);
                    for (int fieldIndex = 0; fieldIndex < records[i].Count && fieldIndex < header.Count; fieldIndex += 1) {
                        row.Set(header[fieldIndex], records[i][fieldIndex]);
                    }
                    rows.Add(row);
                }

                return new Table(header, rows);
            }

            public Dictionary<string, Row> RowsById() {
                Dictionary<string, Row> result = new Dictionary<string, Row>(StringComparer.Ordinal);
                for (int i = 0; i < Rows.Count; i += 1) {
                    string id = Rows[i].Id;
                    if (id.Length > 0 && !result.ContainsKey(id)) {
                        result.Add(id, Rows[i]);
                    }
                }
                return result;
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

        sealed class Row {

            readonly Dictionary<string, string> _values;

            public string Id => Get("ID");

            public Row(IReadOnlyList<string> header) {
                _values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < header.Count; i += 1) {
                    Set(header[i], string.Empty);
                }
            }

            public string Get(string column) {
                if (_values.TryGetValue(column, out string? value)) {
                    return value;
                }
                return string.Empty;
            }

            public void Set(string column, string value) {
                _values[column] = value;
            }

            public Row WithHeader(IReadOnlyList<string> header) {
                Row result = new Row(header);
                for (int i = 0; i < header.Count; i += 1) {
                    result.Set(header[i], Get(header[i]));
                }
                return result;
            }

        }

    }

}
