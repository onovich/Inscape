using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Core.Bird;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;

namespace Inscape.Cli {

    public static class Program {

        static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

        public static int Main(string[] args) {
            if (args.Length == 0) {
                PrintUsage();
                return 1;
            }

            if (IsHelp(args[0])) {
                if (args.Length >= 2 && !IsHelp(args[1])) {
                    return PrintCommandHelp(args[1]) ? 0 : 1;
                }
                PrintUsage();
                return 0;
            }

            if (args[0] == "commands") {
                PrintCommandList();
                return 0;
            }

            if (args.Length < 2) {
                PrintUsage();
                return 1;
            }

            string command = args[0];
            string inputPath = args[1];
            string? outputPath = ReadOption(args, "-o");
            string? previousLocalizationPath = ReadOption(args, "--from");

            if (command == "merge-bird-l10n") {
                return RunMergeBirdL10n(inputPath, previousLocalizationPath, ReadOption(args, "--report"), outputPath);
            }

            if (IsProjectCommand(command)) {
                return RunProjectCommand(command, inputPath, args, outputPath);
            }

            if (!File.Exists(inputPath)) {
                Console.Error.WriteLine("Input file not found: " + inputPath);
                return 1;
            }

            string source = File.ReadAllText(inputPath, Encoding.UTF8);
            InscapeCompiler compiler = new InscapeCompiler();
            CompilationResult result = compiler.Compile(source, Path.GetFullPath(inputPath));

            if (command == "check") {
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "diagnose") {
                string json = JsonSerializer.Serialize(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                return 0;
            }

            if (command == "compile") {
                string json = JsonSerializer.Serialize(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "preview") {
                string html = PreviewHtmlRenderer.Render(ToOutput(result), JsonOptions);
                WriteOrPrint(outputPath, html);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "extract-l10n") {
                string csv = ExtractLocalizationCsv(result.Document);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "update-l10n") {
                if (!TryReadPreviousLocalization(previousLocalizationPath, out List<LocalizationEntry> previousEntries)) {
                    return 1;
                }

                string csv = UpdateLocalizationCsv(result.Document, previousEntries);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            PrintUsage();
            return 1;
        }

        static CompileOutput ToOutput(CompilationResult result) {
            return new CompileOutput {
                Format = "inscape.graph-ir",
                FormatVersion = 1,
                Document = result.Document,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        static ProjectCompileOutput ToProjectOutput(ProjectCompilationResult result) {
            return new ProjectCompileOutput {
                Format = "inscape.project-ir",
                FormatVersion = 1,
                RootPath = result.RootPath,
                Documents = result.Documents,
                Graph = result.Graph,
                EntryNodeName = result.EntryNodeName,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

        static int RunProjectCommand(string command, string rootPath, string[] args, string? outputPath) {
            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return 1;
            }

            ProjectOverride? projectOverride = ReadProjectOverride(args);
            string? entryOverrideName = ReadOption(args, "--entry");
            List<ProjectSource> sources = ReadProjectSources(rootPath, projectOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return 1;
            }

            ProjectCompiler compiler = new ProjectCompiler();
            ProjectCompilationResult result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);

            if (command == "check-project") {
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "diagnose-project") {
                string json = JsonSerializer.Serialize(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                return 0;
            }

            if (command == "compile-project") {
                string json = JsonSerializer.Serialize(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, json);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "preview-project") {
                string html = PreviewHtmlRenderer.Render(ToProjectOutput(result), JsonOptions);
                WriteOrPrint(outputPath, html);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "extract-l10n-project") {
                string csv = ExtractLocalizationCsv(result.Graph);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "update-l10n-project") {
                if (!TryReadPreviousLocalization(ReadOption(args, "--from"), out List<LocalizationEntry> previousEntries)) {
                    return 1;
                }

                string csv = UpdateLocalizationCsv(result.Graph, previousEntries);
                WriteOrPrint(outputPath, csv);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-bird-binding-template") {
                if (!TryReadBirdTimelineBindingsForTemplate(args, out Dictionary<string, BirdTimelineAssetBinding> timelineBindingsByAlias)) {
                    return 1;
                }

                BirdBindingTemplateWriter writer = new BirdBindingTemplateWriter();
                WriteOrPrint(outputPath, writer.Write(result.Graph, timelineBindingsByAlias));
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-bird-role-template") {
                if (!TryReadBirdRoleNameBindingsForTemplate(args, out Dictionary<string, int> roleIdsBySpeaker)) {
                    return 1;
                }

                BirdRoleTemplateWriter writer = new BirdRoleTemplateWriter();
                WriteOrPrint(outputPath, writer.Write(result.Graph, roleIdsBySpeaker));
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-bird-project") {
                if (string.IsNullOrWhiteSpace(outputPath)) {
                    Console.Error.WriteLine("Missing required option: -o <output-directory>");
                    return 1;
                }

                BirdProjectExporter exporter = new BirdProjectExporter();
                if (!TryReadBirdExportOptions(args, out BirdExportOptions options)) {
                    return 1;
                }
                BirdExportResult export = exporter.Export(result, options);
                WriteBirdExport(outputPath, export);
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            Console.Error.WriteLine("Unknown command: " + command);
            PrintUsage();
            return 1;
        }

        static List<ProjectSource> ReadProjectSources(string rootPath, ProjectOverride? projectOverride) {
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

        static ProjectOverride? ReadProjectOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new ProjectOverride(args[i + 1], args[i + 2]);
                }
            }
            return null;
        }

        static bool IsProjectCommand(string command) {
            return command == "check-project"
                || command == "diagnose-project"
                || command == "compile-project"
                || command == "preview-project"
                || command == "extract-l10n-project"
                || command == "update-l10n-project"
                || command == "export-bird-binding-template"
                || command == "export-bird-role-template"
                || command == "export-bird-project";
        }

        static string ExtractLocalizationCsv(Inscape.Core.Model.InscapeDocument document) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(extractor.Extract(document));
        }

        static string UpdateLocalizationCsv(Inscape.Core.Model.InscapeDocument document,
                                            IReadOnlyList<LocalizationEntry> previousEntries) {
            LocalizationExtractor extractor = new LocalizationExtractor();
            LocalizationMerger merger = new LocalizationMerger();
            LocalizationCsvWriter writer = new LocalizationCsvWriter();
            return writer.Write(merger.Merge(extractor.Extract(document), previousEntries), true);
        }

        static bool TryReadPreviousLocalization(string? previousLocalizationPath, out List<LocalizationEntry> entries) {
            entries = new List<LocalizationEntry>();
            if (string.IsNullOrWhiteSpace(previousLocalizationPath)) {
                Console.Error.WriteLine("Missing required option: --from <old.csv>");
                return false;
            }

            if (!File.Exists(previousLocalizationPath)) {
                Console.Error.WriteLine("Previous localization CSV not found: " + previousLocalizationPath);
                return false;
            }

            LocalizationCsvReader reader = new LocalizationCsvReader();
            entries = reader.Read(File.ReadAllText(previousLocalizationPath, Encoding.UTF8));
            return true;
        }

        static int RunMergeBirdL10n(string generatedPath, string? existingPath, string? reportPath, string? outputPath) {
            if (!File.Exists(generatedPath)) {
                Console.Error.WriteLine("Generated Bird L10N CSV not found: " + generatedPath);
                return 1;
            }

            if (string.IsNullOrWhiteSpace(existingPath)) {
                Console.Error.WriteLine("Missing required option: --from <existing-L10N_Talking.csv>");
                return 1;
            }

            if (!File.Exists(existingPath)) {
                Console.Error.WriteLine("Existing Bird L10N CSV not found: " + existingPath);
                return 1;
            }

            try {
                BirdL10nMergePlanner planner = new BirdL10nMergePlanner();
                BirdL10nMergeResult result = planner.Merge(File.ReadAllText(existingPath, Encoding.UTF8),
                                                           File.ReadAllText(generatedPath, Encoding.UTF8));
                WriteOrPrint(outputPath, result.MergedCsv);
                if (!string.IsNullOrWhiteSpace(reportPath)) {
                    WriteOrPrint(reportPath, result.ReportCsv);
                }
                return 0;
            } catch (Exception ex) {
                Console.Error.WriteLine(ex.Message);
                return 1;
            }
        }

        static bool IsSamePath(string left, string right) {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
        }

        static void PrintDiagnostics(IReadOnlyList<Diagnostic> diagnostics) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                Diagnostic diagnostic = diagnostics[i];
                Console.Error.WriteLine(diagnostic.SourcePath
                                      + "(" + diagnostic.Line + "," + diagnostic.Column + "): "
                                      + diagnostic.Severity.ToString().ToLowerInvariant()
                                      + " " + diagnostic.Code + ": "
                                      + diagnostic.Message);
            }
        }

        static void WriteOrPrint(string? outputPath, string content) {
            if (string.IsNullOrWhiteSpace(outputPath)) {
                Console.WriteLine(content);
                return;
            }

            string fullPath = Path.GetFullPath(outputPath);
            string? directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(directory)) {
                Directory.CreateDirectory(directory);
            }
            File.WriteAllText(fullPath, content, Encoding.UTF8);
        }

        static void WriteBirdExport(string outputDirectory, BirdExportResult export) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "bird-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, JsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-bird-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "bird-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

        static bool TryReadBirdExportOptions(string[] args, out BirdExportOptions options) {
            options = new BirdExportOptions {
                TalkingIdStart = ReadIntOption(args, "--bird-talking-start", 100000),
            };

            string? roleMapPath = ReadOption(args, "--bird-role-map");
            if (!string.IsNullOrWhiteSpace(roleMapPath)) {
                if (!TryReadBirdRoleMap(roleMapPath, options)) {
                    return false;
                }
            }

            string? bindingMapPath = ReadOption(args, "--bird-binding-map");
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!TryReadBirdBindingMap(bindingMapPath, options)) {
                    return false;
                }
            }

            return TryReadReservedTalkingIds(args, options);
        }

        static bool TryReadBirdRoleMap(string roleMapPath, BirdExportOptions options) {
            if (!File.Exists(roleMapPath)) {
                Console.Error.WriteLine("Bird role map not found: " + roleMapPath);
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
                    Console.Error.WriteLine("Invalid Bird role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                string speaker = UnquoteCsvField(line.Substring(0, commaIndex).Trim());
                string roleIdText = UnquoteCsvField(line.Substring(commaIndex + 1).Trim());
                if (speaker.Length == 0 || !int.TryParse(roleIdText, out int roleId)) {
                    Console.Error.WriteLine("Invalid Bird role map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                options.RoleIdsBySpeaker[speaker] = roleId;
            }

            return true;
        }

        static bool TryReadBirdBindingMap(string bindingMapPath, BirdExportOptions options) {
            if (!File.Exists(bindingMapPath)) {
                Console.Error.WriteLine("Bird binding map not found: " + bindingMapPath);
                return false;
            }

            string[] lines = File.ReadAllLines(bindingMapPath, Encoding.UTF8);
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i].Trim();
                if (line.Length == 0 || line.StartsWith("#", StringComparison.Ordinal)) {
                    continue;
                }

                List<string> fields = ParseCsvRow(lines[i]);
                if (IsBirdBindingHeader(fields)) {
                    continue;
                }

                if (fields.Count != 6) {
                    Console.Error.WriteLine("Invalid Bird binding map row at line " + (i + 1) + ": " + lines[i]);
                    return false;
                }

                string kind = fields[0].Trim();
                string alias = fields[1].Trim();
                string birdIdText = fields[2].Trim();
                string unityGuid = fields[3].Trim();
                string addressableKey = fields[4].Trim();
                string assetPath = fields[5].Trim();

                if (kind.Length == 0 || alias.Length == 0) {
                    Console.Error.WriteLine("Invalid Bird binding map row at line " + (i + 1) + ": kind and alias are required.");
                    return false;
                }

                int? birdId = null;
                if (birdIdText.Length > 0) {
                    if (!int.TryParse(birdIdText, out int parsedBirdId)) {
                        Console.Error.WriteLine("Invalid Bird binding map row at line " + (i + 1) + ": birdId must be an integer.");
                        return false;
                    }
                    birdId = parsedBirdId;
                }

                if (birdId == null
                    && unityGuid.Length == 0
                    && addressableKey.Length == 0
                    && assetPath.Length == 0) {
                    Console.Error.WriteLine("Invalid Bird binding map row at line " + (i + 1) + ": at least one binding target is required.");
                    return false;
                }

                options.HostBindings.Add(new BirdHostBinding {
                    Kind = kind,
                    Alias = alias,
                    BirdId = birdId,
                    UnityGuid = unityGuid,
                    AddressableKey = addressableKey,
                    AssetPath = assetPath,
                });
            }

            return true;
        }

        static bool TryReadBirdTimelineBindingsForTemplate(string[] args, out Dictionary<string, BirdTimelineAssetBinding> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, BirdTimelineAssetBinding>(StringComparer.Ordinal);
            string? timelineRoot = ReadOption(args, "--bird-existing-timeline-root");
            if (string.IsNullOrWhiteSpace(timelineRoot)) {
                return true;
            }

            if (!Directory.Exists(timelineRoot)) {
                Console.Error.WriteLine("Bird existing timeline root not found: " + timelineRoot);
                return false;
            }

            HashSet<string> ambiguousAliases = new HashSet<string>(StringComparer.Ordinal);
            foreach (string assetPath in Directory.EnumerateFiles(timelineRoot, "*.asset", SearchOption.AllDirectories)) {
                if (!TryReadTimelineId(assetPath, out int timelineId)) {
                    continue;
                }

                BirdTimelineAssetBinding binding = new BirdTimelineAssetBinding {
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

        static bool TryReadBirdRoleNameBindingsForTemplate(string[] args, out Dictionary<string, int> roleIdsBySpeaker) {
            roleIdsBySpeaker = new Dictionary<string, int>(StringComparer.Ordinal);
            string? roleNameCsvPath = ReadOption(args, "--bird-existing-role-name-csv");
            if (string.IsNullOrWhiteSpace(roleNameCsvPath)) {
                return true;
            }

            if (!File.Exists(roleNameCsvPath)) {
                Console.Error.WriteLine("Bird existing role name CSV not found: " + roleNameCsvPath);
                return false;
            }

            string[] lines = File.ReadAllLines(roleNameCsvPath, Encoding.UTF8);
            if (lines.Length == 0) {
                return true;
            }

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

                for (int columnIndex = 0; columnIndex < textColumns.Count; columnIndex += 1) {
                    int column = textColumns[columnIndex];
                    if (column >= fields.Count) {
                        continue;
                    }

                    string speaker = fields[column].Trim();
                    if (speaker.Length == 0 || ambiguousSpeakers.Contains(speaker)) {
                        continue;
                    }

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

        static bool IsBirdBindingHeader(List<string> fields) {
            return fields.Count == 6
                && fields[0].Equals("kind", StringComparison.OrdinalIgnoreCase)
                && fields[1].Equals("alias", StringComparison.OrdinalIgnoreCase)
                && fields[2].Equals("birdId", StringComparison.OrdinalIgnoreCase)
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

        static bool TryReadReservedTalkingIds(string[] args, BirdExportOptions options) {
            string? talkingRoot = ReadOption(args, "--bird-existing-talking-root");
            if (string.IsNullOrWhiteSpace(talkingRoot)) {
                return true;
            }

            if (!Directory.Exists(talkingRoot)) {
                Console.Error.WriteLine("Bird existing talking root not found: " + talkingRoot);
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

        static string? ReadOption(string[] args, string optionName) {
            for (int i = 0; i < args.Length - 1; i += 1) {
                if (args[i] == optionName) {
                    return args[i + 1];
                }
            }
            return null;
        }

        static int ReadIntOption(string[] args, string optionName, int fallback) {
            string? value = ReadOption(args, optionName);
            if (string.IsNullOrWhiteSpace(value)) {
                return fallback;
            }
            if (int.TryParse(value, out int parsed)) {
                return parsed;
            }
            return fallback;
        }

        static bool IsHelp(string value) {
            return value == "-h" || value == "--help" || value == "help";
        }

        static void PrintUsage() {
            Console.WriteLine("Inscape CLI");
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  inscape commands");
            Console.WriteLine("  inscape help <command>");
            Console.WriteLine("  inscape check <file.inscape>");
            Console.WriteLine("  inscape diagnose <file.inscape> [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n <file.inscape> [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]");
            Console.WriteLine("  inscape check-project <root> [--entry node.name]");
            Console.WriteLine("  inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape export-bird-binding-template <root> [--entry node.name] [--override source.inscape temp.inscape] [--bird-existing-timeline-root path] [-o bindings.csv]");
            Console.WriteLine("  inscape export-bird-role-template <root> [--entry node.name] [--override source.inscape temp.inscape] [--bird-existing-role-name-csv path] [-o roles.csv]");
            Console.WriteLine("  inscape export-bird-project <root> [--entry node.name] [--bird-talking-start 100000] [--bird-role-map roles.csv] [--bird-binding-map bindings.csv] [--bird-existing-talking-root path] -o output-dir");
            Console.WriteLine("  inscape merge-bird-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]");
            Console.WriteLine("  inscape compile-project <root> [--entry node.name] [-o output.json]");
            Console.WriteLine("  inscape preview-project <root> [--entry node.name] [-o preview.html]");
            Console.WriteLine("  inscape compile <file.inscape> [-o output.json]");
            Console.WriteLine("  inscape preview <file.inscape> [-o preview.html]");
        }

        static void PrintCommandList() {
            Console.WriteLine("Inscape CLI commands");
            Console.WriteLine();
            Console.WriteLine("Single-file:");
            Console.WriteLine("  check");
            Console.WriteLine("  diagnose");
            Console.WriteLine("  compile");
            Console.WriteLine("  preview");
            Console.WriteLine("  extract-l10n");
            Console.WriteLine("  update-l10n");
            Console.WriteLine();
            Console.WriteLine("Project:");
            Console.WriteLine("  check-project");
            Console.WriteLine("  diagnose-project");
            Console.WriteLine("  compile-project");
            Console.WriteLine("  preview-project");
            Console.WriteLine("  extract-l10n-project");
            Console.WriteLine("  update-l10n-project");
            Console.WriteLine();
            Console.WriteLine("Bird:");
            Console.WriteLine("  export-bird-role-template");
            Console.WriteLine("  export-bird-binding-template");
            Console.WriteLine("  export-bird-project");
            Console.WriteLine("  merge-bird-l10n");
            Console.WriteLine();
            Console.WriteLine("Run `inscape help <command>` for details.");
        }

        static bool PrintCommandHelp(string command) {
            switch (command) {
                case "check":
                    PrintCommandHelpBlock("check",
                                          "Validate one .inscape file and print diagnostics.",
                                          "inscape check <file.inscape>",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- check samples\\court-loop.inscape");
                    return true;
                case "diagnose":
                    PrintCommandHelpBlock("diagnose",
                                          "Compile one .inscape file and write graph IR plus diagnostics as JSON.",
                                          "inscape diagnose <file.inscape> [-o diagnostics.json]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose samples\\court-loop.inscape -o artifacts\\court-loop.diagnostics.json");
                    return true;
                case "compile":
                    PrintCommandHelpBlock("compile",
                                          "Compile one .inscape file and write graph IR as JSON.",
                                          "inscape compile <file.inscape> [-o output.json]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- compile samples\\court-loop.inscape -o artifacts\\court-loop.json");
                    return true;
                case "preview":
                    PrintCommandHelpBlock("preview",
                                          "Render one .inscape file to a static HTML debug preview.",
                                          "inscape preview <file.inscape> [-o preview.html]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- preview samples\\court-loop.inscape -o artifacts\\court-loop.html");
                    return true;
                case "extract-l10n":
                    PrintCommandHelpBlock("extract-l10n",
                                          "Extract localizable text from one .inscape file to CSV.",
                                          "inscape extract-l10n <file.inscape> [-o strings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n samples\\court-loop.inscape -o artifacts\\court-loop.l10n.csv");
                    return true;
                case "update-l10n":
                    PrintCommandHelpBlock("update-l10n",
                                          "Update a one-file localization CSV from a previous CSV by exact anchor match.",
                                          "inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n samples\\court-loop.inscape --from artifacts\\old-l10n.csv -o artifacts\\court-loop.l10n.csv");
                    return true;
                case "check-project":
                    PrintCommandHelpBlock("check-project",
                                          "Validate all .inscape files under a project root.",
                                          "inscape check-project <root> [--entry node.name]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- check-project samples");
                    return true;
                case "diagnose-project":
                    PrintCommandHelpBlock("diagnose-project",
                                          "Compile a project and write project IR plus diagnostics as JSON.",
                                          "inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose-project samples -o artifacts\\samples.diagnostics.json");
                    return true;
                case "compile-project":
                    PrintCommandHelpBlock("compile-project",
                                          "Compile a project and write project IR as JSON.",
                                          "inscape compile-project <root> [--entry node.name] [-o output.json]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- compile-project samples -o artifacts\\samples-project.json");
                    return true;
                case "preview-project":
                    PrintCommandHelpBlock("preview-project",
                                          "Render a project to a static HTML debug preview.",
                                          "inscape preview-project <root> [--entry node.name] [-o preview.html]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- preview-project samples --entry court.cross_exam.loop -o artifacts\\samples-project.html");
                    return true;
                case "extract-l10n-project":
                    PrintCommandHelpBlock("extract-l10n-project",
                                          "Extract project localizable text to CSV.",
                                          "inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\\l10n.csv");
                    return true;
                case "update-l10n-project":
                    PrintCommandHelpBlock("update-l10n-project",
                                          "Update a project localization CSV from a previous CSV by exact anchor match.",
                                          "inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\\old-l10n.csv -o artifacts\\l10n.updated.csv");
                    return true;
                case "export-bird-role-template":
                    PrintCommandHelpBlock("export-bird-role-template",
                                          "Scan project dialogue speakers and write a Bird role binding template.",
                                          "inscape export-bird-role-template <root> [--entry node.name] [--override source.inscape temp.inscape] [--bird-existing-role-name-csv path] [-o roles.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-bird-role-template samples --bird-existing-role-name-csv D:\\UnityProjects\\Bird\\Assets\\Resources_Runtime\\Localization\\L10N_RoleName.csv -o config\\bird-roles.csv",
                                          "Output CSV: speaker,roleId");
                    return true;
                case "export-bird-binding-template":
                    PrintCommandHelpBlock("export-bird-binding-template",
                                          "Scan Timeline hooks and write a Bird host binding template.",
                                          "inscape export-bird-binding-template <root> [--entry node.name] [--override source.inscape temp.inscape] [--bird-existing-timeline-root path] [-o bindings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-bird-binding-template samples --bird-existing-timeline-root D:\\UnityProjects\\Bird\\Assets\\Resources_Runtime\\Timeline -o config\\bird-bindings.csv",
                                          "Output CSV: kind,alias,birdId,unityGuid,addressableKey,assetPath");
                    return true;
                case "export-bird-project":
                    PrintCommandHelpBlock("export-bird-project",
                                          "Export project IR to Bird manifest, Bird L10N CSV, anchor map, and report.",
                                          "inscape export-bird-project <root> [--entry node.name] [--bird-talking-start 100000] [--bird-role-map roles.csv] [--bird-binding-map bindings.csv] [--bird-existing-talking-root path] -o output-dir",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-bird-project samples --bird-role-map config\\bird-roles.csv --bird-binding-map config\\bird-bindings.csv -o artifacts\\bird-export",
                                          "Output files: bird-manifest.json, L10N_Talking.csv, inscape-bird-l10n-map.csv, bird-export-report.txt");
                    return true;
                case "merge-bird-l10n":
                    PrintCommandHelpBlock("merge-bird-l10n",
                                          "Merge generated Inscape Bird L10N_Talking.csv into an existing Bird L10N_Talking.csv without silently reusing stale translations.",
                                          "inscape merge-bird-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- merge-bird-l10n artifacts\\bird-export\\L10N_Talking.csv --from D:\\UnityProjects\\Bird\\Assets\\Resources_Runtime\\Localization\\L10N_Talking.csv --report artifacts\\bird-export\\L10N_Talking.merge-report.csv -o artifacts\\bird-export\\L10N_Talking.merged.csv",
                                          "Preserves unrelated rows and existing translations when source text is unchanged. If source text changed, target-language cells are cleared and old values are written to the report.");
                    return true;
                default:
                    Console.Error.WriteLine("Unknown command: " + command);
                    Console.Error.WriteLine("Run `inscape commands` to list available commands.");
                    return false;
            }
        }

        static void PrintCommandHelpBlock(string command, string description, string usage, string example, string? note = null) {
            Console.WriteLine(command);
            Console.WriteLine();
            Console.WriteLine(description);
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  " + usage);
            Console.WriteLine();
            Console.WriteLine("Example:");
            Console.WriteLine("  " + example);
            if (!string.IsNullOrWhiteSpace(note)) {
                Console.WriteLine();
                Console.WriteLine(note);
            }
        }

        static JsonSerializerOptions CreateJsonOptions() {
            JsonSerializerOptions options = new JsonSerializerOptions {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            };
            options.Converters.Add(new JsonStringEnumConverter());
            return options;
        }

        sealed class ProjectOverride {

            public string SourcePath { get; }

            public string ContentPath { get; }

            public ProjectOverride(string sourcePath, string contentPath) {
                SourcePath = sourcePath;
                ContentPath = contentPath;
            }

        }

    }

}
