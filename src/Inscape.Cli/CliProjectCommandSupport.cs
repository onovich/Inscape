using System.Text;
using System.Text.Json;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Model;

namespace Inscape.Cli {

    static class CliProjectCommandSupport {

        internal static ProjectOverride? ReadProjectOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new ProjectOverride(args[i + 1], args[i + 2]);
                }
            }
            return null;
        }

        internal static List<ProjectSource> ReadProjectSources(string rootPath, ProjectOverride? projectOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            string? overrideSourcePath = projectOverride == null ? null : Path.GetFullPath(projectOverride.SourcePath);
            string? overrideContentPath = projectOverride == null ? null : Path.GetFullPath(projectOverride.ContentPath);
            List<ProjectSource> sources = new List<ProjectSource>();
            bool overrideWasMatched = false;

            IEnumerable<string> files = Directory.EnumerateFiles(fullRootPath, "*.inscape", SearchOption.AllDirectories)
                                                .Where(path => !IsExcludedProjectPath(fullRootPath, path))
                                                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase);

            foreach (string file in files) {
                string fullPath = Path.GetFullPath(file);
                if (overrideContentPath != null && IsSamePath(fullPath, overrideContentPath)) {
                    continue;
                }

                if (overrideSourcePath != null && IsSamePath(fullPath, overrideSourcePath)) {
                    sources.Add(new ProjectSource(overrideSourcePath, File.ReadAllText(projectOverride!.ContentPath, Encoding.UTF8)));
                    overrideWasMatched = true;
                } else {
                    sources.Add(new ProjectSource(fullPath, File.ReadAllText(fullPath, Encoding.UTF8)));
                }
            }

            if (projectOverride != null && !overrideWasMatched) {
                sources.Add(new ProjectSource(overrideSourcePath!, File.ReadAllText(projectOverride.ContentPath, Encoding.UTF8)));
            }

            return sources;
        }

        internal static void WriteUnitySampleExport(string outputDirectory, UnitySampleExportResult export, JsonSerializerOptions jsonOptions) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, jsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-unity-sample-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

        internal static bool TryReadUnitySampleExportOptions(string[] args, CliProjectConfig config, out UnitySampleExportOptions options) {
            options = new UnitySampleExportOptions {
                TalkingIdStart = ReadIntOption(args, "--unity-sample-talking-start", config.UnitySample.TalkingIdStart ?? 100000),
            };

            string? roleMapPath = CliCore.ReadOption(args, "--unity-sample-role-map") ?? config.UnitySample.RoleMap;
            if (!string.IsNullOrWhiteSpace(roleMapPath)) {
                if (!TryReadUnitySampleRoleMap(roleMapPath, options)) {
                    return false;
                }
            }

            string? bindingMapPath = CliCore.ReadOption(args, "--unity-sample-binding-map") ?? config.UnitySample.BindingMap;
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!TryReadUnitySampleBindingMap(bindingMapPath, options)) {
                    return false;
                }
            }

            return TryReadReservedTalkingIds(args, config, options);
        }

        internal static bool TryReadUnitySampleTimelineBindingsForTemplate(string[] args, CliProjectConfig config, out Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, UnitySampleTimelineAssetBinding>(StringComparer.Ordinal);
            string? timelineRoot = CliCore.ReadOption(args, "--unity-sample-existing-timeline-root") ?? config.UnitySample.ExistingTimelineRoot;
            if (string.IsNullOrWhiteSpace(timelineRoot)) {
                return true;
            }

            if (!Directory.Exists(timelineRoot)) {
                Console.Error.WriteLine("UnitySample existing timeline root not found: " + timelineRoot);
                return false;
            }

            HashSet<string> ambiguousAliases = new HashSet<string>(StringComparer.Ordinal);
            foreach (string assetPath in Directory.EnumerateFiles(timelineRoot, "*.asset", SearchOption.AllDirectories)) {
                if (!TryReadTimelineId(assetPath, out int timelineId)) {
                    continue;
                }

                UnitySampleTimelineAssetBinding binding = new UnitySampleTimelineAssetBinding {
                    TimelineId = timelineId,
                    UnityGuid = ReadUnityMetaGuid(assetPath + ".meta"),
                    AssetPath = ToUnityAssetPath(assetPath),
                };

                foreach (string candidate in CreateTimelineAliasCandidates(assetPath)) {
                    if (ambiguousAliases.Contains(candidate)) {
                        continue;
                    }

                    if (bindingsByAlias.ContainsKey(candidate)) {
                        bindingsByAlias.Remove(candidate);
                        ambiguousAliases.Add(candidate);
                    } else {
                        bindingsByAlias.Add(candidate, binding);
                    }
                }
            }

            return true;
        }

        internal static bool TryReadUnitySampleRoleNameBindingsForTemplate(string[] args,
                                                                           CliProjectConfig config,
                                                                           out Dictionary<string, int> roleIdsBySpeaker,
                                                                           out Dictionary<string, List<UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                                           out bool scannedRoleNameCsv) {
            roleIdsBySpeaker = new Dictionary<string, int>(StringComparer.Ordinal);
            candidatesBySpeaker = new Dictionary<string, List<UnitySampleRoleNameCandidate>>(StringComparer.Ordinal);
            scannedRoleNameCsv = false;
            string? roleNameCsvPath = CliCore.ReadOption(args, "--unity-sample-existing-role-name-csv") ?? config.UnitySample.ExistingRoleNameCsv;
            if (string.IsNullOrWhiteSpace(roleNameCsvPath)) {
                return true;
            }

            if (!File.Exists(roleNameCsvPath)) {
                Console.Error.WriteLine("UnitySample existing role name CSV not found: " + roleNameCsvPath);
                return false;
            }

            string[] lines = File.ReadAllLines(roleNameCsvPath, Encoding.UTF8);
            if (lines.Length == 0) {
                return true;
            }
            scannedRoleNameCsv = true;

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

                    AddUnitySampleRoleCandidate(candidatesBySpeaker,
                                                speaker,
                                                new UnitySampleRoleNameCandidate(roleId, description, headers[column].Trim()));

                    if (roleIdsBySpeaker.TryGetValue(speaker, out int existingRoleId)) {
                        if (existingRoleId != roleId) {
                            roleIdsBySpeaker.Remove(speaker);
                            ambiguousSpeakers.Add(speaker);
                        }
                    } else {
                        roleIdsBySpeaker.Add(speaker, roleId);
                    }
                }
            }

            return true;
        }

        internal static string WriteUnitySampleRoleTemplateReport(InscapeDocument graph,
                                                                  IReadOnlyDictionary<string, int> roleIdsBySpeaker,
                                                                  IReadOnlyDictionary<string, List<UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                                  bool scannedRoleNameCsv) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("speaker,status,roleId,candidateRoleIds,candidateDescriptions,candidateLanguages");
            foreach (string speaker in CollectDialogueSpeakers(graph)) {
                roleIdsBySpeaker.TryGetValue(speaker, out int roleId);
                candidatesBySpeaker.TryGetValue(speaker, out List<UnitySampleRoleNameCandidate>? candidates);
                string status = CreateUnitySampleRoleReportStatus(roleIdsBySpeaker.ContainsKey(speaker), candidates, scannedRoleNameCsv);
                AppendCsvField(builder, speaker);
                builder.Append(',');
                AppendCsvField(builder, status);
                builder.Append(',');
                AppendCsvField(builder, roleIdsBySpeaker.ContainsKey(speaker) ? roleId.ToString() : string.Empty);
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateIds(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateDescriptions(candidates));
                builder.Append(',');
                AppendCsvField(builder, JoinRoleCandidateLanguages(candidates));
                builder.AppendLine();
            }
            return builder.ToString();
        }

        static bool IsExcludedProjectPath(string rootPath, string filePath) {
            string relative = Path.GetRelativePath(rootPath, filePath);
            string[] parts = relative.Split(new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar });
            for (int i = 0; i < parts.Length; i += 1) {
                string part = parts[i];
                if (part == ".git" || part == "bin" || part == "obj" || part == "node_modules" || part == "artifacts") {
                    return true;
                }
            }
            return false;
        }

        static bool IsSamePath(string left, string right) {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
        }

        static bool TryReadUnitySampleRoleMap(string roleMapPath, UnitySampleExportOptions options) {
            if (!File.Exists(roleMapPath)) {
                Console.Error.WriteLine("UnitySample role map not found: " + roleMapPath);
                return false;
            }

            string[] lines = File.ReadAllLines(roleMapPath, Encoding.UTF8);
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
                    Console.Error.WriteLine("Invalid UnitySample role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                string speaker = UnquoteCsvField(line.Substring(0, commaIndex).Trim());
                string roleIdText = UnquoteCsvField(line.Substring(commaIndex + 1).Trim());
                if (speaker.Length == 0 || !int.TryParse(roleIdText, out int roleId)) {
                    Console.Error.WriteLine("Invalid UnitySample role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                options.RoleIdsBySpeaker[speaker] = roleId;
            }

            return true;
        }

        static bool TryReadUnitySampleBindingMap(string bindingMapPath, UnitySampleExportOptions options) {
            if (!File.Exists(bindingMapPath)) {
                Console.Error.WriteLine("UnitySample binding map not found: " + bindingMapPath);
                return false;
            }

            string[] lines = File.ReadAllLines(bindingMapPath, Encoding.UTF8);
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) {
                    continue;
                }

                List<string> fields = ParseCsvRow(lines[i]);
                if (IsUnitySampleBindingHeader(fields)) {
                    continue;
                }

                if (fields.Count != 6) {
                    Console.Error.WriteLine("Invalid UnitySample binding map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                string kind = fields[0].Trim();
                string alias = fields[1].Trim();
                string unitySampleIdText = fields[2].Trim();
                string unityGuid = fields[3].Trim();
                string addressableKey = fields[4].Trim();
                string assetPath = fields[5].Trim();

                if (kind.Length == 0 || alias.Length == 0) {
                    Console.Error.WriteLine("Invalid UnitySample binding map row at line " + (i + 1) + ": kind and alias are required.");
                    return false;
                }

                int? unitySampleId = null;
                if (unitySampleIdText.Length > 0) {
                    if (!int.TryParse(unitySampleIdText, out int parsedUnitySampleId)) {
                        Console.Error.WriteLine("Invalid UnitySample binding map row at line " + (i + 1) + ": unitySampleId must be an integer.");
                        return false;
                    }
                    unitySampleId = parsedUnitySampleId;
                }

                if (unitySampleId == null
                    && unityGuid.Length == 0
                    && addressableKey.Length == 0
                    && assetPath.Length == 0) {
                    Console.Error.WriteLine("Invalid UnitySample binding map row at line " + (i + 1) + ": at least one binding target is required.");
                    return false;
                }

                options.HostBindings.Add(new UnitySampleHostBinding {
                    Kind = kind,
                    Alias = alias,
                    UnitySampleId = unitySampleId,
                    UnityGuid = unityGuid,
                    AddressableKey = addressableKey,
                    AssetPath = assetPath,
                });
            }

            return true;
        }

        static void AddUnitySampleRoleCandidate(Dictionary<string, List<UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                string speaker,
                                                UnitySampleRoleNameCandidate candidate) {
            if (!candidatesBySpeaker.TryGetValue(speaker, out List<UnitySampleRoleNameCandidate>? candidates)) {
                candidates = new List<UnitySampleRoleNameCandidate>();
                candidatesBySpeaker.Add(speaker, candidates);
            }

            for (int i = 0; i < candidates.Count; i += 1) {
                if (candidates[i].RoleId == candidate.RoleId && candidates[i].Language == candidate.Language) {
                    return;
                }
            }
            candidates.Add(candidate);
        }

        static string CreateUnitySampleRoleReportStatus(bool hasUniqueRoleId,
                                                        List<UnitySampleRoleNameCandidate>? candidates,
                                                        bool scannedRoleNameCsv) {
            if (hasUniqueRoleId) {
                return "unique";
            }
            if (!scannedRoleNameCsv) {
                return "unscanned";
            }
            if (candidates != null && candidates.Count > 0) {
                return "ambiguous";
            }
            return "missing";
        }

        static SortedSet<string> CollectDialogueSpeakers(InscapeDocument graph) {
            SortedSet<string> speakers = new SortedSet<string>(StringComparer.Ordinal);
            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    if (line.Kind == NarrativeLineKind.Dialogue && !string.IsNullOrWhiteSpace(line.Speaker)) {
                        speakers.Add(line.Speaker.Trim());
                    }
                }
            }
            return speakers;
        }

        static string JoinRoleCandidateIds(List<UnitySampleRoleNameCandidate>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<int> ids = new SortedSet<int>();
            for (int i = 0; i < candidates.Count; i += 1) {
                ids.Add(candidates[i].RoleId);
            }
            return string.Join("|", ids);
        }

        static string JoinRoleCandidateDescriptions(List<UnitySampleRoleNameCandidate>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<string> descriptions = new SortedSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < candidates.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(candidates[i].Description)) {
                    descriptions.Add(candidates[i].RoleId + ":" + candidates[i].Description);
                }
            }
            return string.Join("|", descriptions);
        }

        static string JoinRoleCandidateLanguages(List<UnitySampleRoleNameCandidate>? candidates) {
            if (candidates == null || candidates.Count == 0) {
                return string.Empty;
            }

            SortedSet<string> languages = new SortedSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < candidates.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(candidates[i].Language)) {
                    languages.Add(candidates[i].Language);
                }
            }
            return string.Join("|", languages);
        }

        static bool TryReadTimelineId(string assetPath, out int timelineId) {
            timelineId = 0;
            foreach (string rawLine in File.ReadLines(assetPath, Encoding.UTF8)) {
                string line = rawLine.Trim();
                if (!line.StartsWith("timelineId:", StringComparison.Ordinal)) {
                    continue;
                }

                string value = line.Substring("timelineId:".Length).Trim();
                return int.TryParse(value, out timelineId);
            }

            return false;
        }

        static string ReadUnityMetaGuid(string metaPath) {
            if (!File.Exists(metaPath)) {
                return string.Empty;
            }

            foreach (string rawLine in File.ReadLines(metaPath, Encoding.UTF8)) {
                string line = rawLine.Trim();
                if (line.StartsWith("guid:", StringComparison.Ordinal)) {
                    return line.Substring("guid:".Length).Trim();
                }
            }

            return string.Empty;
        }

        static string ToUnityAssetPath(string assetPath) {
            string normalized = Path.GetFullPath(assetPath).Replace('\\', '/');
            int marker = normalized.IndexOf("/Assets/", StringComparison.OrdinalIgnoreCase);
            if (marker >= 0) {
                return normalized.Substring(marker + 1);
            }

            if (normalized.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase)) {
                return normalized;
            }

            return normalized;
        }

        static SortedSet<string> CreateTimelineAliasCandidates(string assetPath) {
            SortedSet<string> candidates = new SortedSet<string>(StringComparer.Ordinal);
            string name = Path.GetFileNameWithoutExtension(assetPath);
            AddTimelineAliasCandidate(candidates, name);

            const string prefix = "SO_Timeline_";
            if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) {
                AddTimelineAliasCandidate(candidates, name.Substring(prefix.Length));
            }

            return candidates;
        }

        static void AddTimelineAliasCandidate(SortedSet<string> candidates, string value) {
            if (string.IsNullOrWhiteSpace(value)) {
                return;
            }

            candidates.Add(value);
            candidates.Add(value.ToLowerInvariant());
            string dotted = value.Replace('_', '.').Replace('-', '.');
            candidates.Add(dotted);
            candidates.Add(dotted.ToLowerInvariant());
        }

        static bool IsUnitySampleBindingHeader(List<string> fields) {
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

        static string UnquoteCsvField(string value) {
            if (value.Length >= 2 && value[0] == '"' && value[value.Length - 1] == '"') {
                return value.Substring(1, value.Length - 2).Replace("\"\"", "\"");
            }
            return value;
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

        static bool TryReadReservedTalkingIds(string[] args, CliProjectConfig config, UnitySampleExportOptions options) {
            string? talkingRoot = CliCore.ReadOption(args, "--unity-sample-existing-talking-root") ?? config.UnitySample.ExistingTalkingRoot;
            if (string.IsNullOrWhiteSpace(talkingRoot)) {
                return true;
            }

            if (!Directory.Exists(talkingRoot)) {
                Console.Error.WriteLine("UnitySample existing talking root not found: " + talkingRoot);
                return false;
            }

            foreach (string assetPath in Directory.EnumerateFiles(talkingRoot, "*.asset", SearchOption.AllDirectories)) {
                string[] lines = File.ReadAllLines(assetPath, Encoding.UTF8);
                for (int i = 0; i < lines.Length; i += 1) {
                    string line = lines[i].Trim();
                    if (!line.StartsWith("talkingId:", StringComparison.Ordinal)) {
                        continue;
                    }

                    string value = line.Substring("talkingId:".Length).Trim();
                    if (int.TryParse(value, out int talkingId)) {
                        options.ReservedTalkingIds.Add(talkingId);
                    }
                    break;
                }
            }

            return true;
        }

        static int ReadIntOption(string[] args, string optionName, int fallback) {
            string? value = CliCore.ReadOption(args, optionName);
            if (string.IsNullOrWhiteSpace(value)) {
                return fallback;
            }
            if (int.TryParse(value, out int parsed)) {
                return parsed;
            }
            return fallback;
        }

        internal sealed class ProjectOverride {

            public string SourcePath { get; }

            public string ContentPath { get; }

            public ProjectOverride(string sourcePath, string contentPath) {
                SourcePath = sourcePath;
                ContentPath = contentPath;
            }

        }

        internal sealed class UnitySampleRoleNameCandidate {

            public int RoleId { get; }

            public string Description { get; }

            public string Language { get; }

            public UnitySampleRoleNameCandidate(int roleId, string description, string language) {
                RoleId = roleId;
                Description = description;
                Language = language;
            }

        }

    }

}