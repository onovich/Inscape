using System.Globalization;
using System.Text.RegularExpressions;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Compiler.Parsing;

namespace Inscape.Tooling {

    public static class UsageManifestDomain {

        static readonly Regex TimelineMetadataPattern = new Regex(
            @"^(?<indent>\s*)@timeline(?<phase>\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*(?<alias>[^\s\]]+)",
            RegexOptions.Compiled);

        static readonly Regex EmitActionPattern = new Regex(
            @"^(?<indent>\s*)@emit\s+(?<name>[A-Za-z_][A-Za-z0-9_.-]*)",
            RegexOptions.Compiled);

        public static UsageManifestModel Inspect(string workspacePath,
                                                 string? configuredConfigPath,
                                                 IReadOnlyList<DslScriptSourceModel> sources,
                                                 HostSchemaCapabilityCatalogModel hostSchemaCatalog) {
            string fullWorkspacePath = Path.GetFullPath(workspacePath);
            UsageManifestModel manifest = new UsageManifestModel {
                Workspace = new UsageManifestWorkspaceModel {
                    Root = fullWorkspacePath,
                    ConfigPath = ResolveDisplayConfigPath(fullWorkspacePath, configuredConfigPath),
                },
            };

            Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName = CreateQueryMap(hostSchemaCatalog.Queries);
            Dictionary<string, HostSchemaActionCapabilityModel> actionsByName = CreateActionMap(hostSchemaCatalog.Actions);
            Dictionary<string, HostSchemaEventCapabilityModel> eventsByName = CreateEventMap(hostSchemaCatalog.Events);

            for (int sourceIndex = 0; sourceIndex < sources.Count; sourceIndex += 1) {
                DslScriptSourceModel source = sources[sourceIndex];
                string displayPath = CreateDisplayPath(fullWorkspacePath, source.SourcePath);
                string[] lines = source.Source.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
                for (int lineIndex = 0; lineIndex < lines.Length; lineIndex += 1) {
                    string line = lines[lineIndex];
                    int lineNumber = lineIndex + 1;
                    CollectQueryUsages(manifest, displayPath, line, lineNumber, queriesByName);
                    CollectActionUsages(manifest, displayPath, line, lineNumber, actionsByName, eventsByName);
                }

                CollectConditionQueryUsages(manifest, fullWorkspacePath, source, queriesByName);
            }

            FinalizeSummary(manifest, sources.Count);
            return manifest;
        }

        static void CollectQueryUsages(UsageManifestModel manifest,
                                       string sourcePath,
                                       string line,
                                       int lineNumber,
                                       Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName) {
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
                if (IsSimpleQueryPath(body) && !IsLeadingConditionBracket(line, open, close)) {
                    string raw = line.Substring(open, close - open + 1);
                    UsageManifestQueryUsageModel query = new UsageManifestQueryUsageModel {
                        Name = body.Trim(),
                        Syntax = "path",
                        Context = "query-interpolation",
                        Raw = raw,
                        Source = CreateSource(sourcePath, lineNumber, open + 1, raw.Length),
                    };
                    manifest.Queries.Add(query);
                    AddRequiredIdsForQuery(manifest, query, queriesByName);
                }

                searchStart = close + 1;
            }
        }

        static void CollectConditionQueryUsages(UsageManifestModel manifest,
                                                string workspacePath,
                                                DslScriptSourceModel source,
                                                Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName) {
            DslScriptParserDomain parser = new DslScriptParserDomain();
            DslScriptCompilationResultModel result = parser.Parse(source.Source, source.SourcePath);
            string fallbackDisplayPath = CreateDisplayPath(workspacePath, source.SourcePath);

            for (int nodeIndex = 0; nodeIndex < result.Document.Nodes.Count; nodeIndex += 1) {
                StoryGraphNodeModel node = result.Document.Nodes[nodeIndex];
                for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                    DslScriptChoiceGroupModel choice = node.Choices[choiceIndex];
                    for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                        DslScriptConditionModel? condition = choice.Options[optionIndex].Condition;
                        if (condition != null) {
                            CollectConditionQueryUsages(manifest,
                                                        workspacePath,
                                                        fallbackDisplayPath,
                                                        condition.Expression,
                                                        "choice-condition",
                                                        queriesByName);
                        }
                    }
                }

                for (int jumpIndex = 0; jumpIndex < node.ConditionalJumps.Count; jumpIndex += 1) {
                    DslScriptConditionalJumpModel jump = node.ConditionalJumps[jumpIndex];
                    CollectConditionQueryUsages(manifest,
                                                workspacePath,
                                                fallbackDisplayPath,
                                                jump.Condition.Expression,
                                                "conditional-jump",
                                                queriesByName);
                }
            }
        }

        static void CollectConditionQueryUsages(UsageManifestModel manifest,
                                                string workspacePath,
                                                string fallbackDisplayPath,
                                                DslScriptConditionExpressionModel? expression,
                                                string context,
                                                Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName) {
            if (expression == null) {
                return;
            }

            if (expression.Kind == DslScriptConditionExpressionKindModel.Query && expression.Query != null) {
                UsageManifestQueryUsageModel query = CreateConditionQueryUsage(workspacePath,
                                                                               fallbackDisplayPath,
                                                                               expression,
                                                                               expression.Query,
                                                                               context);
                manifest.Queries.Add(query);
                AddRequiredIdsForQuery(manifest, query, queriesByName);
                return;
            }

            CollectConditionQueryUsages(manifest, workspacePath, fallbackDisplayPath, expression.Left, context, queriesByName);
            CollectConditionQueryUsages(manifest, workspacePath, fallbackDisplayPath, expression.Right, context, queriesByName);
            CollectConditionQueryUsages(manifest, workspacePath, fallbackDisplayPath, expression.Operand, context, queriesByName);
        }

        static UsageManifestQueryUsageModel CreateConditionQueryUsage(string workspacePath,
                                                                      string fallbackDisplayPath,
                                                                      DslScriptConditionExpressionModel expression,
                                                                      DslScriptConditionQueryModel conditionQuery,
                                                                      string context) {
            string sourcePath = string.IsNullOrWhiteSpace(conditionQuery.Source.SourcePath)
                ? fallbackDisplayPath
                : CreateDisplayPath(workspacePath, conditionQuery.Source.SourcePath);
            UsageManifestQueryUsageModel query = new UsageManifestQueryUsageModel {
                Name = conditionQuery.Name,
                Syntax = conditionQuery.Syntax == DslScriptConditionQuerySyntaxModel.Call ? "call" : "path",
                Context = context,
                Raw = expression.Raw,
                Source = CreateSource(sourcePath,
                                      conditionQuery.Source.Line,
                                      conditionQuery.Source.Column,
                                      Math.Max(expression.Raw.Length, conditionQuery.Name.Length)),
            };

            for (int argumentIndex = 0; argumentIndex < conditionQuery.Arguments.Count; argumentIndex += 1) {
                query.Arguments.Add(CreateConditionArgument(workspacePath,
                                                           fallbackDisplayPath,
                                                           argumentIndex,
                                                           conditionQuery.Arguments[argumentIndex]));
            }

            return query;
        }

        static UsageManifestLiteralArgumentModel CreateConditionArgument(string workspacePath,
                                                                         string fallbackDisplayPath,
                                                                         int index,
                                                                         DslScriptConditionLiteralModel literal) {
            string sourcePath = string.IsNullOrWhiteSpace(literal.Source.SourcePath)
                ? fallbackDisplayPath
                : CreateDisplayPath(workspacePath, literal.Source.SourcePath);
            UsageManifestLiteralArgumentModel argument = new UsageManifestLiteralArgumentModel {
                Index = index,
                Raw = literal.Raw,
                LiteralKind = ConvertConditionLiteralKind(literal.LiteralKind),
                Source = CreateSource(sourcePath,
                                      literal.Source.Line,
                                      literal.Source.Column,
                                      Math.Max(literal.Raw.Length, 1)),
            };

            if (literal.LiteralKind == DslScriptConditionLiteralKindModel.String) {
                argument.Value = literal.StringValue;
            } else if (literal.LiteralKind == DslScriptConditionLiteralKindModel.Number) {
                argument.Value = literal.NumberValue;
            } else if (literal.LiteralKind == DslScriptConditionLiteralKindModel.Bool) {
                argument.Value = literal.BoolValue;
            } else if (literal.LiteralKind == DslScriptConditionLiteralKindModel.Identifier) {
                argument.Value = literal.StringValue;
            }

            return argument;
        }

        static string ConvertConditionLiteralKind(DslScriptConditionLiteralKindModel literalKind) {
            if (literalKind == DslScriptConditionLiteralKindModel.String) {
                return "string";
            }
            if (literalKind == DslScriptConditionLiteralKindModel.Number) {
                return "number";
            }
            if (literalKind == DslScriptConditionLiteralKindModel.Bool) {
                return "bool";
            }
            if (literalKind == DslScriptConditionLiteralKindModel.Identifier) {
                return "identifier";
            }

            return "unknown";
        }

        static void CollectActionUsages(UsageManifestModel manifest,
                                        string sourcePath,
                                        string line,
                                        int lineNumber,
                                        Dictionary<string, HostSchemaActionCapabilityModel> actionsByName,
                                        Dictionary<string, HostSchemaEventCapabilityModel> eventsByName) {
            string trimmedStart = line.TrimStart();
            if (trimmedStart.Length == 0 || trimmedStart[0] != '@') {
                return;
            }

            Match timelineMatch = TimelineMetadataPattern.Match(line);
            if (timelineMatch.Success) {
                AddTimelineUsage(manifest, sourcePath, line, lineNumber, timelineMatch);
                return;
            }

            Match emitMatch = EmitActionPattern.Match(line);
            if (emitMatch.Success) {
                AddEmitUsage(manifest, sourcePath, line, lineNumber, emitMatch, actionsByName, eventsByName);
            }
        }

        static void AddTimelineUsage(UsageManifestModel manifest,
                                     string sourcePath,
                                     string line,
                                     int lineNumber,
                                     Match match) {
            Group aliasGroup = match.Groups["alias"];
            string alias = aliasGroup.Value.Trim();
            if (alias.Length == 0) {
                return;
            }

            int rawStart = match.Groups["indent"].Length;
            string raw = line.Substring(rawStart, match.Length - rawStart).TrimEnd();
            string phase = match.Groups["phase"].Success
                ? match.Groups["phase"].Value.Substring(1)
                : "talking.exit";

            UsageManifestLiteralArgumentModel argument = new UsageManifestLiteralArgumentModel {
                Index = 0,
                Name = "alias",
                Raw = alias,
                LiteralKind = "identifier",
                Value = alias,
                Source = CreateSource(sourcePath, lineNumber, aliasGroup.Index + 1, aliasGroup.Length),
            };

            UsageManifestActionUsageModel action = new UsageManifestActionUsageModel {
                Name = "timeline",
                UsageKind = "host-binding-hook",
                Context = "timeline-hook",
                Phase = phase,
                Raw = raw,
                Source = CreateSource(sourcePath, lineNumber, rawStart + 1, Math.Max(raw.Length, 1)),
            };
            action.Arguments.Add(argument);
            manifest.Actions.Add(action);

            AddRequiredId(manifest,
                          "timeline",
                          alias,
                          "action",
                          "timeline",
                          0,
                          "timeline-hook-alias",
                          argument.Source);
        }

        static void AddEmitUsage(UsageManifestModel manifest,
                                 string sourcePath,
                                 string line,
                                 int lineNumber,
                                 Match match,
                                 Dictionary<string, HostSchemaActionCapabilityModel> actionsByName,
                                 Dictionary<string, HostSchemaEventCapabilityModel> eventsByName) {
            string actionName = match.Groups["name"].Value.Trim();
            if (actionName.Length == 0) {
                return;
            }

            int rawStart = match.Groups["indent"].Length;
            string raw = line.Substring(rawStart).TrimEnd();
            List<UsageManifestLiteralArgumentModel> arguments = TokenizeArguments(sourcePath,
                                                                                  line,
                                                                                  lineNumber,
                                                                                  match.Index + match.Length);

            string usageKind = actionsByName.ContainsKey(actionName)
                ? "schema-action"
                : eventsByName.ContainsKey(actionName)
                    ? "legacy-event"
                    : "schema-action";

            UsageManifestActionUsageModel action = new UsageManifestActionUsageModel {
                Name = actionName,
                UsageKind = usageKind,
                Context = "action-line",
                Raw = raw,
                Arguments = arguments,
                Source = CreateSource(sourcePath, lineNumber, rawStart + 1, Math.Max(raw.Length, 1)),
            };
            manifest.Actions.Add(action);

            if (actionsByName.TryGetValue(actionName, out HostSchemaActionCapabilityModel? actionCapability)) {
                ApplyParameterMetadata(arguments, actionCapability.Parameters);
                AddRequiredIdsForParameters(manifest,
                                            arguments,
                                            actionCapability.Parameters,
                                            "action",
                                            actionName,
                                            "host-schema-parameter-idKind");
            } else if (eventsByName.TryGetValue(actionName, out HostSchemaEventCapabilityModel? eventCapability)) {
                ApplyParameterMetadata(arguments, eventCapability.Parameters);
                AddRequiredIdsForParameters(manifest,
                                            arguments,
                                            eventCapability.Parameters,
                                            "action",
                                            actionName,
                                            "host-schema-parameter-idKind");
            }
        }

        static void AddRequiredIdsForQuery(UsageManifestModel manifest,
                                           UsageManifestQueryUsageModel query,
                                           Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName) {
            if (!queriesByName.TryGetValue(query.Name, out HostSchemaQueryCapabilityModel? queryCapability)) {
                return;
            }

            ApplyParameterMetadata(query.Arguments, queryCapability.Parameters);
            AddRequiredIdsForParameters(manifest,
                                        query.Arguments,
                                        queryCapability.Parameters,
                                        "query",
                                        query.Name,
                                        "host-schema-parameter-idKind");
        }

        static void AddRequiredIdsForParameters(UsageManifestModel manifest,
                                                IReadOnlyList<UsageManifestLiteralArgumentModel> arguments,
                                                IReadOnlyList<HostSchemaParameterModel> parameters,
                                                string capabilityKind,
                                                string capabilityName,
                                                string reason) {
            int count = Math.Min(arguments.Count, parameters.Count);
            for (int i = 0; i < count; i += 1) {
                HostSchemaParameterModel parameter = parameters[i];
                string idKind = parameter.IdKind ?? string.Empty;
                if (string.IsNullOrWhiteSpace(idKind)) {
                    continue;
                }

                UsageManifestLiteralArgumentModel argument = arguments[i];
                if (argument.Value is string idName && idName.Length > 0) {
                    AddRequiredId(manifest,
                                  idKind.Trim(),
                                  idName,
                                  capabilityKind,
                                  capabilityName,
                                  argument.Index,
                                  reason,
                                  argument.Source);
                }
            }
        }

        static void ApplyParameterMetadata(IReadOnlyList<UsageManifestLiteralArgumentModel> arguments,
                                           IReadOnlyList<HostSchemaParameterModel> parameters) {
            int count = Math.Min(arguments.Count, parameters.Count);
            for (int i = 0; i < count; i += 1) {
                if (!string.IsNullOrWhiteSpace(parameters[i].Name)) {
                    arguments[i].Name = parameters[i].Name.Trim();
                }
            }
        }

        static void AddRequiredId(UsageManifestModel manifest,
                                  string kind,
                                  string name,
                                  string capabilityKind,
                                  string capabilityName,
                                  int argumentIndex,
                                  string reason,
                                  UsageManifestSourceLocationModel source) {
            if (manifest.RequiredIds.Any(candidate => candidate.Kind == kind
                                                     && candidate.Name == name
                                                     && candidate.UsedBy.CapabilityKind == capabilityKind
                                                     && candidate.UsedBy.Name == capabilityName
                                                     && candidate.UsedBy.ArgumentIndex == argumentIndex
                                                     && candidate.Source.Path == source.Path
                                                     && candidate.Source.Line == source.Line
                                                     && candidate.Source.Column == source.Column)) {
                return;
            }

            manifest.RequiredIds.Add(new UsageManifestRequiredIdModel {
                Kind = kind,
                Name = name,
                UsedBy = new UsageManifestRequiredIdUsageModel {
                    CapabilityKind = capabilityKind,
                    Name = capabilityName,
                    ArgumentIndex = argumentIndex,
                },
                Reason = reason,
                Source = CreateSource(source.Path, source.Line, source.Column, source.Length),
            });
        }

        static List<UsageManifestLiteralArgumentModel> TokenizeArguments(string sourcePath,
                                                                         string line,
                                                                         int lineNumber,
                                                                         int startIndex) {
            List<UsageManifestLiteralArgumentModel> arguments = new List<UsageManifestLiteralArgumentModel>();
            int index = startIndex;
            while (index < line.Length) {
                while (index < line.Length && char.IsWhiteSpace(line[index])) {
                    index += 1;
                }

                if (index >= line.Length) {
                    break;
                }

                int tokenStart = index;
                string raw;
                if (line[index] == '"') {
                    index += 1;
                    bool closed = false;
                    while (index < line.Length) {
                        if (line[index] == '\\' && index + 1 < line.Length) {
                            index += 2;
                            continue;
                        }

                        if (line[index] == '"') {
                            index += 1;
                            closed = true;
                            break;
                        }

                        index += 1;
                    }

                    raw = line.Substring(tokenStart, index - tokenStart);
                    arguments.Add(CreateTokenArgument(arguments.Count, sourcePath, lineNumber, tokenStart, raw, closed));
                    continue;
                }

                while (index < line.Length && !char.IsWhiteSpace(line[index])) {
                    index += 1;
                }

                raw = line.Substring(tokenStart, index - tokenStart);
                arguments.Add(CreateTokenArgument(arguments.Count, sourcePath, lineNumber, tokenStart, raw, true));
            }

            return arguments;
        }

        static UsageManifestLiteralArgumentModel CreateTokenArgument(int index,
                                                                     string sourcePath,
                                                                     int lineNumber,
                                                                     int tokenStart,
                                                                     string raw,
                                                                     bool tokenIsClosed) {
            UsageManifestLiteralArgumentModel argument = new UsageManifestLiteralArgumentModel {
                Index = index,
                Raw = raw,
                Source = CreateSource(sourcePath, lineNumber, tokenStart + 1, Math.Max(raw.Length, 1)),
            };

            if (!tokenIsClosed) {
                argument.LiteralKind = "unknown";
                return argument;
            }

            if (raw.Length >= 2 && raw[0] == '"' && raw[raw.Length - 1] == '"') {
                argument.LiteralKind = "string";
                argument.Value = UnescapeString(raw.Substring(1, raw.Length - 2));
                return argument;
            }

            if (bool.TryParse(raw, out bool boolValue)) {
                argument.LiteralKind = "bool";
                argument.Value = boolValue;
                return argument;
            }

            if (long.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out long integerValue)) {
                argument.LiteralKind = "number";
                argument.Value = integerValue;
                return argument;
            }

            if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out double numberValue)) {
                argument.LiteralKind = "number";
                argument.Value = numberValue;
                return argument;
            }

            if (IsIdentifierToken(raw)) {
                argument.LiteralKind = "identifier";
                argument.Value = raw;
                return argument;
            }

            argument.LiteralKind = raw.Contains("(") || raw.Contains(")") ? "expression" : "unknown";
            return argument;
        }

        static string UnescapeString(string value) {
            return value.Replace("\\\"", "\"").Replace("\\\\", "\\");
        }

        static bool IsSimpleQueryPath(string value) {
            string trimmed = value.Trim();
            if (trimmed.Length == 0 || trimmed.Contains(":")) {
                return false;
            }

            string[] segments = trimmed.Split('.');
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

        static bool IsLeadingConditionBracket(string line, int open, int close) {
            int markerIndex = FirstNonWhitespaceIndex(line, 0);
            if (markerIndex < 0 || (line[markerIndex] != '-' && line[markerIndex] != '?')) {
                return false;
            }

            int bracketIndex = FirstNonWhitespaceIndex(line, markerIndex + 1);
            if (bracketIndex != open) {
                return false;
            }

            if (line[markerIndex] == '?') {
                string afterCondition = line.Substring(close + 1).TrimStart();
                return afterCondition.StartsWith("->", StringComparison.Ordinal);
            }

            return true;
        }

        static int FirstNonWhitespaceIndex(string text, int startIndex) {
            for (int i = startIndex; i < text.Length; i += 1) {
                if (!char.IsWhiteSpace(text[i])) {
                    return i;
                }
            }

            return -1;
        }

        static bool IsIdentifierToken(string value) {
            if (value.Length == 0 || !IsIdentifierStart(value[0])) {
                return false;
            }

            for (int i = 1; i < value.Length; i += 1) {
                char current = value[i];
                if (!IsIdentifierPart(current) && current != '.' && current != '-') {
                    return false;
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

        static Dictionary<string, HostSchemaQueryCapabilityModel> CreateQueryMap(IReadOnlyList<HostSchemaQueryCapabilityModel> queries) {
            Dictionary<string, HostSchemaQueryCapabilityModel> map = new Dictionary<string, HostSchemaQueryCapabilityModel>(StringComparer.Ordinal);
            for (int i = 0; i < queries.Count; i += 1) {
                if (!map.ContainsKey(queries[i].Name)) {
                    map.Add(queries[i].Name, queries[i]);
                }
            }
            return map;
        }

        static Dictionary<string, HostSchemaActionCapabilityModel> CreateActionMap(IReadOnlyList<HostSchemaActionCapabilityModel> actions) {
            Dictionary<string, HostSchemaActionCapabilityModel> map = new Dictionary<string, HostSchemaActionCapabilityModel>(StringComparer.Ordinal);
            for (int i = 0; i < actions.Count; i += 1) {
                if (!map.ContainsKey(actions[i].Name)) {
                    map.Add(actions[i].Name, actions[i]);
                }
            }
            return map;
        }

        static Dictionary<string, HostSchemaEventCapabilityModel> CreateEventMap(IReadOnlyList<HostSchemaEventCapabilityModel> events) {
            Dictionary<string, HostSchemaEventCapabilityModel> map = new Dictionary<string, HostSchemaEventCapabilityModel>(StringComparer.Ordinal);
            for (int i = 0; i < events.Count; i += 1) {
                if (!map.ContainsKey(events[i].Name)) {
                    map.Add(events[i].Name, events[i]);
                }
            }
            return map;
        }

        static UsageManifestSourceLocationModel CreateSource(string path, int line, int column, int length) {
            return new UsageManifestSourceLocationModel {
                Path = path,
                Line = line,
                Column = column,
                Length = Math.Max(length, 1),
            };
        }

        static string ResolveDisplayConfigPath(string workspacePath, string? configuredConfigPath) {
            string fullPath = string.IsNullOrWhiteSpace(configuredConfigPath)
                ? Path.Combine(workspacePath, "inscape.config.json")
                : Path.GetFullPath(configuredConfigPath);
            return CreateDisplayPath(workspacePath, fullPath);
        }

        static string CreateDisplayPath(string workspacePath, string path) {
            string fullPath = Path.GetFullPath(path);
            string relative = Path.GetRelativePath(workspacePath, fullPath);
            if (!relative.StartsWith("..", StringComparison.Ordinal)
                && !Path.IsPathRooted(relative)) {
                return relative.Replace(Path.DirectorySeparatorChar, '/').Replace(Path.AltDirectorySeparatorChar, '/');
            }

            return fullPath.Replace(Path.DirectorySeparatorChar, '/').Replace(Path.AltDirectorySeparatorChar, '/');
        }

        static void FinalizeSummary(UsageManifestModel manifest, int sourceCount) {
            manifest.Summary.SourceCount = sourceCount;
            manifest.Summary.QueryCount = manifest.Queries.Count;
            manifest.Summary.ActionCount = manifest.Actions.Count;
            manifest.Summary.RequiredIdCount = manifest.RequiredIds.Count;
            manifest.Summary.NonLiteralArgumentCount = CountNonLiteralArguments(manifest);
        }

        static int CountNonLiteralArguments(UsageManifestModel manifest) {
            int count = 0;
            for (int i = 0; i < manifest.Queries.Count; i += 1) {
                count += CountNonLiteralArguments(manifest.Queries[i].Arguments);
            }
            for (int i = 0; i < manifest.Actions.Count; i += 1) {
                count += CountNonLiteralArguments(manifest.Actions[i].Arguments);
            }
            return count;
        }

        static int CountNonLiteralArguments(IReadOnlyList<UsageManifestLiteralArgumentModel> arguments) {
            int count = 0;
            for (int i = 0; i < arguments.Count; i += 1) {
                string kind = arguments[i].LiteralKind;
                if (kind == "expression" || kind == "unknown") {
                    count += 1;
                }
            }
            return count;
        }

    }

}
