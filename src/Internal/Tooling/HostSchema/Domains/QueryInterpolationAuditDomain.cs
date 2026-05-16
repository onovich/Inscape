using Inscape.Compiler.Compilation;

namespace Inscape.Tooling {

    public static class QueryInterpolationAuditDomain {

        public static QueryInterpolationAuditModel Audit(string workspacePath,
                                                         ToolConfigModel config,
                                                         IReadOnlyList<DslScriptSourceModel> sources,
                                                         HostSchemaQueryReadResultModel hostSchemaQueries) {
            QueryInterpolationAuditModel audit = new QueryInterpolationAuditModel {
                Workspace = Path.GetFullPath(workspacePath),
                HostSchema = new QueryInterpolationHostSchemaModel {
                    ConfiguredPath = hostSchemaQueries.ConfiguredPath,
                    ResolvedPath = hostSchemaQueries.ResolvedPath,
                    Loaded = hostSchemaQueries.Loaded,
                },
            };

            List<QueryInterpolationOccurrence> occurrences = CollectOccurrences(sources);
            audit.Summary.InterpolationCount = occurrences.Count;

            if (string.IsNullOrWhiteSpace(config.HostSchema)) {
                audit.Diagnostics.Add(CreateDiagnostic("IQI003",
                                                       "info",
                                                       "No hostSchema is configured; query interpolation audit was skipped.",
                                                       string.Empty,
                                                       string.Empty,
                                                       Path.Combine(Path.GetFullPath(workspacePath), "inscape.config.json"),
                                                       1,
                                                       1,
                                                       1));
                FinalizeSummary(audit);
                return audit;
            }

            if (!hostSchemaQueries.Loaded) {
                audit.Diagnostics.Add(CreateDiagnostic("IQI004",
                                                       "warning",
                                                       hostSchemaQueries.ErrorMessage ?? "Configured Host Schema could not be loaded.",
                                                       string.Empty,
                                                       string.Empty,
                                                       config.HostSchema,
                                                       1,
                                                       1,
                                                       1));
                FinalizeSummary(audit);
                return audit;
            }

            Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName = new Dictionary<string, HostSchemaQueryCapabilityModel>(StringComparer.Ordinal);
            for (int i = 0; i < hostSchemaQueries.Queries.Count; i += 1) {
                HostSchemaQueryCapabilityModel query = hostSchemaQueries.Queries[i];
                if (!queriesByName.ContainsKey(query.Name)) {
                    queriesByName.Add(query.Name, query);
                }
            }

            for (int i = 0; i < occurrences.Count; i += 1) {
                QueryInterpolationOccurrence occurrence = occurrences[i];
                if (!queriesByName.TryGetValue(occurrence.Query, out HostSchemaQueryCapabilityModel? query)) {
                    audit.Diagnostics.Add(CreateDiagnostic("IQI001",
                                                           "warning",
                                                           "Query '" + occurrence.Query + "' is not declared in the configured Host Schema.",
                                                           occurrence.Query,
                                                           occurrence.Raw,
                                                           occurrence.SourcePath,
                                                           occurrence.Line,
                                                           occurrence.Column,
                                                           occurrence.Raw.Length));
                    continue;
                }

                if (query.Parameters.Count > 0) {
                    audit.Diagnostics.Add(CreateDiagnostic("IQI002",
                                                           "warning",
                                                           "Query '" + occurrence.Query + "' requires parameters and cannot be used as first-version text interpolation.",
                                                           occurrence.Query,
                                                           occurrence.Raw,
                                                           occurrence.SourcePath,
                                                           occurrence.Line,
                                                           occurrence.Column,
                                                           occurrence.Raw.Length));
                }
            }

            FinalizeSummary(audit);
            return audit;
        }

        static List<QueryInterpolationOccurrence> CollectOccurrences(IReadOnlyList<DslScriptSourceModel> sources) {
            List<QueryInterpolationOccurrence> occurrences = new List<QueryInterpolationOccurrence>();
            for (int i = 0; i < sources.Count; i += 1) {
                DslScriptSourceModel source = sources[i];
                string[] lines = source.Source.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
                for (int lineIndex = 0; lineIndex < lines.Length; lineIndex += 1) {
                    CollectOccurrencesFromLine(source.SourcePath, lines[lineIndex], lineIndex + 1, occurrences);
                }
            }

            return occurrences;
        }

        static void CollectOccurrencesFromLine(string sourcePath,
                                               string line,
                                               int lineNumber,
                                               List<QueryInterpolationOccurrence> occurrences) {
            int searchStart = 0;
            while (searchStart < line.Length) {
                int open = line.IndexOf('[', searchStart);
                if (open < 0) {
                    break;
                }

                int close = line.IndexOf(']', open + 1);
                if (close < 0) {
                    break;
                }

                string body = line.Substring(open + 1, close - open - 1);
                if (IsSimpleQueryPath(body)) {
                    string raw = line.Substring(open, close - open + 1);
                    occurrences.Add(new QueryInterpolationOccurrence(sourcePath, raw, body, lineNumber, open + 1));
                }

                searchStart = close + 1;
            }
        }

        static bool IsSimpleQueryPath(string value) {
            if (string.IsNullOrWhiteSpace(value) || value.Contains(":")) {
                return false;
            }

            string[] segments = value.Split('.');
            for (int i = 0; i < segments.Length; i += 1) {
                string segment = segments[i];
                if (segment.Length == 0 || !IsIdentifierStart(segment[0])) {
                    return false;
                }

                for (int j = 1; j < segment.Length; j += 1) {
                    if (!IsIdentifierPart(segment[j])) {
                        return false;
                    }
                }
            }

            return true;
        }

        static bool IsIdentifierStart(char value) {
            return value == '_' || (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
        }

        static bool IsIdentifierPart(char value) {
            return IsIdentifierStart(value) || (value >= '0' && value <= '9');
        }

        static QueryInterpolationAuditDiagnosticModel CreateDiagnostic(string code,
                                                                       string severity,
                                                                       string message,
                                                                       string query,
                                                                       string raw,
                                                                       string sourcePath,
                                                                       int line,
                                                                       int column,
                                                                       int length) {
            return new QueryInterpolationAuditDiagnosticModel {
                Code = code,
                Severity = severity,
                Message = message,
                Query = query,
                Raw = raw,
                Source = new QueryInterpolationSourceModel {
                    Path = sourcePath,
                    Line = line,
                    Column = column,
                    Length = length,
                },
            };
        }

        static void FinalizeSummary(QueryInterpolationAuditModel audit) {
            audit.Summary.DiagnosticCount = audit.Diagnostics.Count;
            for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                QueryInterpolationAuditDiagnosticModel diagnostic = audit.Diagnostics[i];
                if (diagnostic.Code == "IQI001") {
                    audit.Summary.UnknownQueryCount += 1;
                } else if (diagnostic.Code == "IQI002") {
                    audit.Summary.ParameterizedQueryCount += 1;
                }
            }
        }

        readonly struct QueryInterpolationOccurrence {

            public string SourcePath { get; }

            public string Raw { get; }

            public string Query { get; }

            public int Line { get; }

            public int Column { get; }

            public QueryInterpolationOccurrence(string sourcePath, string raw, string query, int line, int column) {
                SourcePath = sourcePath;
                Raw = raw;
                Query = query;
                Line = line;
                Column = column;
            }
        }

    }

}
