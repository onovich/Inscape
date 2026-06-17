namespace Inscape.Tooling {

    public static class HostIntegrationAuditDomain {

        public static HostIntegrationAuditModel Audit(string workspacePath,
                                                      string? configuredConfigPath,
                                                      UsageManifestModel usage,
                                                      HostSchemaCapabilityCatalogModel hostSchemaCatalog,
                                                      HostBindingCapabilityCatalogModel hostBindingCatalog) {
            string fullWorkspacePath = Path.GetFullPath(workspacePath);
            HostIntegrationAuditModel audit = new HostIntegrationAuditModel {
                Workspace = new HostIntegrationAuditWorkspaceModel {
                    Root = fullWorkspacePath,
                    ConfigPath = ResolveDisplayConfigPath(fullWorkspacePath, configuredConfigPath),
                },
                Inputs = new HostIntegrationAuditInputModel {
                    UsageFormat = usage.Format,
                    UsageFormatVersion = usage.FormatVersion,
                    HostSchema = new HostIntegrationAuditInputSourceModel {
                        ConfiguredPath = hostSchemaCatalog.HostSchema.ConfiguredPath,
                        ResolvedPath = hostSchemaCatalog.HostSchema.ResolvedPath,
                        Loaded = hostSchemaCatalog.HostSchema.Loaded,
                        ErrorMessage = hostSchemaCatalog.HostSchema.ErrorMessage,
                    },
                    HostBridge = new HostIntegrationAuditInputSourceModel {
                        ConfiguredPath = hostBindingCatalog.HostBridge.ConfiguredPath,
                        ResolvedPath = hostBindingCatalog.HostBridge.ResolvedPath,
                        Loaded = hostBindingCatalog.HostBridge.Loaded,
                        ErrorMessage = hostBindingCatalog.HostBridge.ErrorMessage,
                    },
                },
            };

            if (!string.IsNullOrWhiteSpace(hostSchemaCatalog.HostSchema.ErrorMessage)) {
                AddDiagnostic(audit,
                              "warning",
                              "HIA100",
                              "input",
                              "hostSchema",
                              hostSchemaCatalog.HostSchema.ConfiguredPath ?? string.Empty,
                              hostSchemaCatalog.HostSchema.ErrorMessage ?? string.Empty,
                              new UsageManifestSourceLocationModel());
            }

            if (!string.IsNullOrWhiteSpace(hostBindingCatalog.HostBridge.ErrorMessage)) {
                AddDiagnostic(audit,
                              "warning",
                              "HIA101",
                              "input",
                              "hostBridge",
                              hostBindingCatalog.HostBridge.ConfiguredPath ?? string.Empty,
                              hostBindingCatalog.HostBridge.ErrorMessage ?? string.Empty,
                              new UsageManifestSourceLocationModel());
            }

            Dictionary<string, HostSchemaQueryCapabilityModel> queriesByName = CreateQueryMap(hostSchemaCatalog.Queries);
            Dictionary<string, HostSchemaActionCapabilityModel> actionsByName = CreateActionMap(hostSchemaCatalog.Actions);
            Dictionary<string, HostSchemaEventCapabilityModel> eventsByName = CreateEventMap(hostSchemaCatalog.Events);
            HashSet<string> hostBridgeIds = CreateHostBridgeIdSet(hostBindingCatalog);
            HashSet<string> hostBridgeActions = CreateHostBridgeActionSet(hostBindingCatalog.Actions);
            HashSet<string> hostBridgeQueries = CreateHostBridgeQuerySet(hostBindingCatalog.Queries);
            HashSet<string> reportedMissingActionHandlers = new HashSet<string>(StringComparer.Ordinal);
            HashSet<string> reportedMissingQueryHandlers = new HashSet<string>(StringComparer.Ordinal);

            for (int i = 0; i < usage.Queries.Count; i += 1) {
                UsageManifestQueryUsageModel query = usage.Queries[i];
                if (!queriesByName.TryGetValue(query.Name, out HostSchemaQueryCapabilityModel? queryCapability)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA001",
                                  "host-schema",
                                  "query",
                                  query.Name,
                                  "Query usage '" + query.Name + "' is not declared in Host Schema queries[].",
                                  query.Source);
                    continue;
                }

                AuditParameters(audit,
                                "query",
                                query.Name,
                                query.Arguments,
                                queryCapability.Parameters,
                                query.Source);

                if (!hostBridgeQueries.Contains(query.Name)
                    && reportedMissingQueryHandlers.Add(query.Name)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA008",
                                  "host-bridge",
                                  "query",
                                  query.Name,
                                  "Query '" + query.Name + "' is declared in Host Schema but has no Host Bridge queries[] handler mapping.",
                                  query.Source);
                }
            }

            for (int i = 0; i < usage.Actions.Count; i += 1) {
                UsageManifestActionUsageModel action = usage.Actions[i];
                if (action.UsageKind == "host-binding-hook") {
                    AuditHostBindingHook(audit, action, hostBridgeIds);
                    continue;
                }

                if (action.UsageKind == "legacy-event") {
                    AddDiagnostic(audit,
                                  "warning",
                                  "HIA003",
                                  "host-schema",
                                  "action",
                                  action.Name,
                                  "Action usage '" + action.Name + "' resolves through legacy Host Schema events[]; migrate it to actions[].",
                                  action.Source);

                    if (eventsByName.TryGetValue(action.Name, out HostSchemaEventCapabilityModel? eventCapability)) {
                        AuditParameters(audit,
                                        "action",
                                        action.Name,
                                        action.Arguments,
                                        eventCapability.Parameters,
                                        action.Source);
                    }

                    continue;
                }

                if (!actionsByName.TryGetValue(action.Name, out HostSchemaActionCapabilityModel? actionCapability)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA002",
                                  "host-schema",
                                  "action",
                                  action.Name,
                                  "Action usage '" + action.Name + "' is not declared in Host Schema actions[].",
                                  action.Source);
                    continue;
                }

                AuditParameters(audit,
                                "action",
                                action.Name,
                                action.Arguments,
                                actionCapability.Parameters,
                                action.Source);

                if (!hostBridgeActions.Contains(action.Name)
                    && reportedMissingActionHandlers.Add(action.Name)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA007",
                                  "host-bridge",
                                  "action",
                                  action.Name,
                                  "Action '" + action.Name + "' is declared in Host Schema but has no Host Bridge actions[] handler mapping.",
                                  action.Source);
                }
            }

            for (int i = 0; i < usage.RequiredIds.Count; i += 1) {
                UsageManifestRequiredIdModel requiredId = usage.RequiredIds[i];
                string key = CreateIdKey(requiredId.Kind, requiredId.Name);
                if (!hostBridgeIds.Contains(key)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA004",
                                  "host-bridge",
                                  requiredId.Kind,
                                  requiredId.Name,
                                  "Required id '" + requiredId.Kind + ":" + requiredId.Name + "' is not mapped in Host Bridge ids[].",
                                  requiredId.Source);
                }
            }

            FinalizeSummary(audit, usage);
            return audit;
        }

        static void AuditHostBindingHook(HostIntegrationAuditModel audit,
                                         UsageManifestActionUsageModel action,
                                         HashSet<string> hostBridgeIds) {
            if (action.Name == "timeline"
                && action.Arguments.Count > 0
                && action.Arguments[0].Value is string timelineName
                && timelineName.Length > 0) {
                string key = CreateIdKey("timeline", timelineName);
                if (!hostBridgeIds.Contains(key)) {
                    AddDiagnostic(audit,
                                  "error",
                                  "HIA004",
                                  "host-bridge",
                                  "timeline",
                                  timelineName,
                                  "Timeline hook '" + timelineName + "' is not mapped in Host Bridge ids[].",
                                  action.Arguments[0].Source);
                }
            }
        }

        static void AuditParameters(HostIntegrationAuditModel audit,
                                    string capabilityKind,
                                    string capabilityName,
                                    IReadOnlyList<UsageManifestLiteralArgumentModel> arguments,
                                    IReadOnlyList<HostSchemaParameterModel> parameters,
                                    UsageManifestSourceLocationModel fallbackSource) {
            int requiredCount = 0;
            for (int i = 0; i < parameters.Count; i += 1) {
                if (parameters[i].Required) {
                    requiredCount += 1;
                }
            }

            if (arguments.Count < requiredCount || arguments.Count > parameters.Count) {
                AddDiagnostic(audit,
                              "error",
                              "HIA005",
                              "parameters",
                              capabilityKind,
                              capabilityName,
                              "Usage '" + capabilityName + "' has " + arguments.Count + " argument(s), but Host Schema expects "
                              + requiredCount + " required and " + parameters.Count + " total parameter(s).",
                              fallbackSource);
            }

            int count = Math.Min(arguments.Count, parameters.Count);
            for (int i = 0; i < count; i += 1) {
                UsageManifestLiteralArgumentModel argument = arguments[i];
                HostSchemaParameterModel parameter = parameters[i];
                if (IsParameterCompatible(argument, parameter)) {
                    continue;
                }

                string severity = argument.LiteralKind == "expression" || argument.LiteralKind == "unknown"
                    ? "warning"
                    : "error";
                AddDiagnostic(audit,
                              severity,
                              "HIA006",
                              "parameters",
                              capabilityKind,
                              capabilityName,
                              "Argument " + i + " for '" + capabilityName + "' has literal kind '" + argument.LiteralKind
                              + "', but Host Schema parameter '" + parameter.Name + "' expects type '" + parameter.Type + "'.",
                              argument.Source);
            }
        }

        static bool IsParameterCompatible(UsageManifestLiteralArgumentModel argument, HostSchemaParameterModel parameter) {
            string parameterType = (parameter.Type ?? string.Empty).Trim().ToLowerInvariant();
            if (parameterType.Length == 0 || parameterType == "any") {
                return true;
            }

            return parameterType switch {
                "string" => argument.LiteralKind == "string" || argument.LiteralKind == "identifier",
                "id" => argument.LiteralKind == "string" || argument.LiteralKind == "identifier",
                "number" => argument.LiteralKind == "number",
                "integer" => argument.LiteralKind == "number",
                "float" => argument.LiteralKind == "number",
                "bool" => argument.LiteralKind == "bool",
                "boolean" => argument.LiteralKind == "bool",
                _ => true,
            };
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

        static HashSet<string> CreateHostBridgeIdSet(HostBindingCapabilityCatalogModel catalog) {
            HashSet<string> set = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < catalog.Speakers.Count; i += 1) {
                HostBindingSpeakerCapabilityModel speaker = catalog.Speakers[i];
                if (HasHostBridgeLocation(speaker.Locations)) {
                    set.Add(CreateIdKey("speaker", speaker.Name));
                }
            }

            for (int i = 0; i < catalog.Bindings.Count; i += 1) {
                HostBindingResourceCapabilityModel binding = catalog.Bindings[i];
                if (HasHostBridgeLocation(binding.Locations)) {
                    set.Add(CreateIdKey(binding.Kind, binding.Name));
                }
            }

            return set;
        }

        static HashSet<string> CreateHostBridgeActionSet(IReadOnlyList<HostBindingActionCapabilityModel> actions) {
            HashSet<string> set = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < actions.Count; i += 1) {
                if (HasHostBridgeLocation(actions[i].Locations)) {
                    set.Add(actions[i].Name);
                }
            }
            return set;
        }

        static HashSet<string> CreateHostBridgeQuerySet(IReadOnlyList<HostBindingQueryCapabilityModel> queries) {
            HashSet<string> set = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < queries.Count; i += 1) {
                if (HasHostBridgeLocation(queries[i].Locations)) {
                    set.Add(queries[i].Name);
                }
            }
            return set;
        }

        static bool HasHostBridgeLocation(IReadOnlyList<HostBindingCapabilityLocationModel> locations) {
            for (int i = 0; i < locations.Count; i += 1) {
                if (locations[i].SourceKind == "hostBridge") {
                    return true;
                }
            }
            return false;
        }

        static string CreateIdKey(string kind, string name) {
            return kind + "\n" + name;
        }

        static void AddDiagnostic(HostIntegrationAuditModel audit,
                                  string severity,
                                  string code,
                                  string category,
                                  string subjectKind,
                                  string subjectName,
                                  string message,
                                  UsageManifestSourceLocationModel source) {
            audit.Diagnostics.Add(new HostIntegrationAuditDiagnosticModel {
                Severity = severity,
                Code = code,
                Category = category,
                SubjectKind = subjectKind,
                SubjectName = subjectName,
                Message = message,
                Source = new UsageManifestSourceLocationModel {
                    Path = source.Path,
                    Line = source.Line,
                    Column = source.Column,
                    Length = source.Length,
                },
            });
        }

        static void FinalizeSummary(HostIntegrationAuditModel audit, UsageManifestModel usage) {
            audit.Summary.QueryUsageCount = usage.Queries.Count;
            audit.Summary.ActionUsageCount = usage.Actions.Count;
            audit.Summary.RequiredIdCount = usage.RequiredIds.Count;
            audit.Summary.DiagnosticCount = audit.Diagnostics.Count;
            for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                string severity = audit.Diagnostics[i].Severity;
                if (severity == "error") {
                    audit.Summary.ErrorCount += 1;
                } else if (severity == "warning") {
                    audit.Summary.WarningCount += 1;
                } else if (severity == "info") {
                    audit.Summary.InfoCount += 1;
                }
            }
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

    }

}
