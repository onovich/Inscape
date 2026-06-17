using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class HostBindingCapabilityCatalogDomain {

        static readonly Regex TimelineMetadataPattern = new Regex(
            @"^\s*@timeline(?:\.(?:talking|node)\.(?:enter|exit))?(?::|\s+)\s*([^\s\]]+)",
            RegexOptions.Compiled);

        public static HostBindingCapabilityCatalogModel Read(string workspacePath,
                                                             string? hostBridgePath,
                                                             IReadOnlyList<DslScriptSourceModel> sources) {
            string fullWorkspacePath = Path.GetFullPath(workspacePath);
            HostBindingCapabilityCatalogModel catalog = new HostBindingCapabilityCatalogModel {
                Workspace = fullWorkspacePath,
                HostBridge = new HostBindingCapabilitySourceModel {
                    ConfiguredPath = hostBridgePath,
                    ResolvedPath = hostBridgePath,
                },
            };

            AddConfiguredCapabilities(catalog, hostBridgePath);
            AddScriptCapabilities(catalog, sources, fullWorkspacePath);

            catalog.Speakers = catalog.Speakers
                .OrderBy(speaker => speaker.SourceRank)
                .ThenBy(speaker => speaker.Name, StringComparer.Ordinal)
                .ToList();
            catalog.Bindings = catalog.Bindings
                .OrderBy(binding => binding.SourceRank)
                .ThenBy(binding => binding.Kind, StringComparer.Ordinal)
                .ThenBy(binding => binding.Name, StringComparer.Ordinal)
                .ToList();
            catalog.Actions = catalog.Actions
                .OrderBy(action => action.SourceRank)
                .ThenBy(action => action.Name, StringComparer.Ordinal)
                .ToList();
            catalog.Queries = catalog.Queries
                .OrderBy(query => query.SourceRank)
                .ThenBy(query => query.Name, StringComparer.Ordinal)
                .ToList();

            return catalog;
        }

        static void AddConfiguredCapabilities(HostBindingCapabilityCatalogModel catalog, string? hostBridgePath) {
            if (string.IsNullOrWhiteSpace(hostBridgePath)) {
                return;
            }

            if (!File.Exists(hostBridgePath)) {
                catalog.HostBridge.ErrorMessage = "Host Bridge not found: " + hostBridgePath;
                return;
            }

            try {
                string text = File.ReadAllText(hostBridgePath, Encoding.UTF8);
                using JsonDocument document = JsonDocument.Parse(text);
                catalog.HostBridge.Loaded = true;

                if (document.RootElement.TryGetProperty("ids", out JsonElement ids)
                    && ids.ValueKind == JsonValueKind.Array) {
                    foreach (JsonElement id in ids.EnumerateArray()) {
                        string declaredKind = ReadString(id, "kind");
                        string name = ReadString(id, "name").Trim();
                        if (declaredKind.Length == 0 || name.Length == 0) {
                            continue;
                        }

                        JsonElement host = id.TryGetProperty("host", out JsonElement hostValue)
                            && hostValue.ValueKind == JsonValueKind.Object
                            ? hostValue
                            : default;

                        if (declaredKind == "speaker") {
                            AddSpeaker(catalog.Speakers, new HostBindingSpeakerCapabilityModel {
                                Name = name,
                                DisplayName = ReadString(id, "displayName"),
                                RoleId = ReadHostString(host, "roleId"),
                                SourcePath = hostBridgePath,
                                SourceLabel = "Host Bridge",
                                SourceKind = "hostBridge",
                                SourceRank = 0,
                                Line = 0,
                                Character = 0,
                                Length = Math.Max(name.Length, 1),
                            });
                        } else {
                            AddBinding(catalog.Bindings, new HostBindingResourceCapabilityModel {
                                Kind = NormalizeBindingKind(declaredKind),
                                Name = name,
                                AssetId = ReadHostString(host, "assetId"),
                                UnityGuid = ReadHostString(host, "unityGuid"),
                                AddressableKey = ReadHostString(host, "addressableKey"),
                                AssetPath = ReadHostString(host, "assetPath"),
                                SourcePath = hostBridgePath,
                                SourceLabel = "Host Bridge",
                                SourceKind = "hostBridge",
                                SourceRank = 0,
                                Line = 0,
                                Character = 0,
                                Length = Math.Max(name.Length, 1),
                            });
                        }
                    }
                }

                AddConfiguredActionCapabilities(catalog.Actions, document.RootElement, hostBridgePath, "actions");
                AddConfiguredActionCapabilities(catalog.Actions, document.RootElement, hostBridgePath, "events");
                AddConfiguredQueryCapabilities(catalog.Queries, document.RootElement, hostBridgePath);
            } catch (Exception ex) {
                catalog.HostBridge.ErrorMessage = "Invalid Host Bridge '" + hostBridgePath + "': " + ex.Message;
            }
        }

        static void AddConfiguredActionCapabilities(List<HostBindingActionCapabilityModel> actions,
                                                    JsonElement root,
                                                    string hostBridgePath,
                                                    string propertyName) {
            if (!root.TryGetProperty(propertyName, out JsonElement actionArray)
                || actionArray.ValueKind != JsonValueKind.Array) {
                return;
            }

            foreach (JsonElement action in actionArray.EnumerateArray()) {
                string name = ReadString(action, "name").Trim();
                if (name.Length == 0) {
                    continue;
                }

                AddAction(actions, new HostBindingActionCapabilityModel {
                    Name = name,
                    SourcePath = hostBridgePath,
                    SourceLabel = propertyName == "events" ? "Host Bridge legacy event" : "Host Bridge action",
                    SourceKind = "hostBridge",
                    SourceRank = 0,
                    Line = 0,
                    Character = 0,
                    Length = Math.Max(name.Length, 1),
                });
            }
        }

        static void AddConfiguredQueryCapabilities(List<HostBindingQueryCapabilityModel> queries,
                                                   JsonElement root,
                                                   string hostBridgePath) {
            if (!root.TryGetProperty("queries", out JsonElement queryArray)
                || queryArray.ValueKind != JsonValueKind.Array) {
                return;
            }

            foreach (JsonElement query in queryArray.EnumerateArray()) {
                string name = ReadString(query, "name").Trim();
                if (name.Length == 0) {
                    continue;
                }

                AddQuery(queries, new HostBindingQueryCapabilityModel {
                    Name = name,
                    SourcePath = hostBridgePath,
                    SourceLabel = "Host Bridge query",
                    SourceKind = "hostBridge",
                    SourceRank = 0,
                    Line = 0,
                    Character = 0,
                    Length = Math.Max(name.Length, 1),
                });
            }
        }

        static void AddScriptCapabilities(HostBindingCapabilityCatalogModel catalog,
                                          IReadOnlyList<DslScriptSourceModel> sources,
                                          string workspacePath) {
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel result = compiler.Compile(sources, workspacePath);

            foreach (DslScriptDocumentModel document in result.Documents) {
                foreach (StoryGraphNodeModel node in document.Nodes) {
                    foreach (DslScriptLineModel line in node.Lines) {
                        if (line.Kind == DslScriptLineKindModel.Dialogue
                            && !string.IsNullOrWhiteSpace(line.Speaker)) {
                            AddSpeaker(catalog.Speakers, new HostBindingSpeakerCapabilityModel {
                                Name = line.Speaker.Trim(),
                                SourcePath = line.Source.SourcePath,
                                SourceLabel = "Workspace speaker",
                                SourceKind = "script",
                                SourceRank = 1,
                                Line = Math.Max(0, line.Source.Line - 1),
                                Character = Math.Max(0, line.Source.Column - 1),
                                Length = Math.Max(line.Speaker.Trim().Length, 1),
                            });
                        }

                        if (line.Kind == DslScriptLineKindModel.Metadata) {
                            AddTimelineBinding(catalog.Bindings, line);
                        }
                    }
                }
            }
        }

        static void AddTimelineBinding(List<HostBindingResourceCapabilityModel> bindings, DslScriptLineModel line) {
            Match match = TimelineMetadataPattern.Match(line.Text);
            if (!match.Success) {
                return;
            }

            string name = match.Groups[1].Value.Trim();
            if (name.Length == 0) {
                return;
            }

            AddBinding(bindings, new HostBindingResourceCapabilityModel {
                Kind = "timeline",
                Name = name,
                SourcePath = line.Source.SourcePath,
                SourceLabel = "Workspace timeline hook",
                SourceKind = "script",
                SourceRank = 1,
                Line = Math.Max(0, line.Source.Line - 1),
                Character = Math.Max(0, line.Source.Column - 1 + match.Groups[1].Index),
                Length = Math.Max(name.Length, 1),
            });
        }

        static void AddSpeaker(List<HostBindingSpeakerCapabilityModel> speakers,
                               HostBindingSpeakerCapabilityModel speaker) {
            HostBindingSpeakerCapabilityModel? existing = speakers.FirstOrDefault(candidate => candidate.Name == speaker.Name);
            HostBindingCapabilityLocationModel location = CreateLocation(speaker.SourcePath,
                                                                         speaker.SourceLabel,
                                                                         speaker.SourceKind,
                                                                         speaker.SourceRank,
                                                                         speaker.Line,
                                                                         speaker.Character,
                                                                         speaker.Length);
            if (existing != null) {
                AddLocation(existing.Locations, location);
                return;
            }

            AddLocation(speaker.Locations, location);
            speakers.Add(speaker);
        }

        static void AddBinding(List<HostBindingResourceCapabilityModel> bindings,
                               HostBindingResourceCapabilityModel binding) {
            HostBindingResourceCapabilityModel? existing = bindings.FirstOrDefault(candidate => candidate.Kind == binding.Kind && candidate.Name == binding.Name);
            HostBindingCapabilityLocationModel location = CreateLocation(binding.SourcePath,
                                                                         binding.SourceLabel,
                                                                         binding.SourceKind,
                                                                         binding.SourceRank,
                                                                         binding.Line,
                                                                         binding.Character,
                                                                         binding.Length);
            if (existing != null) {
                AddLocation(existing.Locations, location);
                return;
            }

            AddLocation(binding.Locations, location);
            bindings.Add(binding);
        }

        static void AddAction(List<HostBindingActionCapabilityModel> actions,
                              HostBindingActionCapabilityModel action) {
            HostBindingActionCapabilityModel? existing = actions.FirstOrDefault(candidate => candidate.Name == action.Name);
            HostBindingCapabilityLocationModel location = CreateLocation(action.SourcePath,
                                                                         action.SourceLabel,
                                                                         action.SourceKind,
                                                                         action.SourceRank,
                                                                         action.Line,
                                                                         action.Character,
                                                                         action.Length);
            if (existing != null) {
                AddLocation(existing.Locations, location);
                return;
            }

            AddLocation(action.Locations, location);
            actions.Add(action);
        }

        static void AddQuery(List<HostBindingQueryCapabilityModel> queries,
                             HostBindingQueryCapabilityModel query) {
            HostBindingQueryCapabilityModel? existing = queries.FirstOrDefault(candidate => candidate.Name == query.Name);
            HostBindingCapabilityLocationModel location = CreateLocation(query.SourcePath,
                                                                         query.SourceLabel,
                                                                         query.SourceKind,
                                                                         query.SourceRank,
                                                                         query.Line,
                                                                         query.Character,
                                                                         query.Length);
            if (existing != null) {
                AddLocation(existing.Locations, location);
                return;
            }

            AddLocation(query.Locations, location);
            queries.Add(query);
        }

        static HostBindingCapabilityLocationModel CreateLocation(string sourcePath,
                                                                 string sourceLabel,
                                                                 string sourceKind,
                                                                 int sourceRank,
                                                                 int line,
                                                                 int character,
                                                                 int length) {
            return new HostBindingCapabilityLocationModel {
                SourcePath = sourcePath,
                SourceLabel = sourceLabel,
                SourceKind = sourceKind,
                SourceRank = sourceRank,
                Line = line,
                Character = character,
                Length = Math.Max(length, 1),
            };
        }

        static void AddLocation(List<HostBindingCapabilityLocationModel> locations,
                                HostBindingCapabilityLocationModel location) {
            if (locations.Any(candidate => candidate.SourcePath == location.SourcePath
                                           && candidate.Line == location.Line
                                           && candidate.Character == location.Character
                                           && candidate.Length == location.Length)) {
                return;
            }

            locations.Add(location);
        }

        static string NormalizeBindingKind(string kind) {
            if (kind == "timeline"
                || Regex.IsMatch(kind, @"^timeline\.(?:talking|node)\.(?:enter|exit)$")) {
                return "timeline";
            }

            return kind;
        }

        static string ReadString(JsonElement element, string propertyName) {
            return element.TryGetProperty(propertyName, out JsonElement property)
                && property.ValueKind == JsonValueKind.String
                ? property.GetString() ?? string.Empty
                : string.Empty;
        }

        static string ReadHostString(JsonElement host, string propertyName) {
            if (host.ValueKind != JsonValueKind.Object
                || !host.TryGetProperty(propertyName, out JsonElement property)) {
                return string.Empty;
            }

            return property.ValueKind switch {
                JsonValueKind.String => property.GetString() ?? string.Empty,
                JsonValueKind.Number => property.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => string.Empty,
            };
        }

    }

}
