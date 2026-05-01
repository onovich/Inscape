using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Inscape.Adapters.UnitySample;
using Inscape.Core.Compilation;
using Inscape.Core.Diagnostics;
using Inscape.Core.Localization;
using Inscape.Core.Model;

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

            if (args[0] == "export-host-schema-template") {
                WriteOrPrint(ReadOption(args, "-o"), CreateHostSchemaTemplateJson());
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

            if (command == "merge-unity-sample-l10n") {
                return RunMergeUnitySampleL10n(inputPath, previousLocalizationPath, ReadOption(args, "--report"), outputPath);
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

            if (!TryReadProjectConfig(rootPath, args, out ProjectConfig config)) {
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

            if (command == "export-unity-sample-binding-template") {
                if (!TryReadUnitySampleTimelineBindingsForTemplate(args, config, out Dictionary<string, UnitySampleTimelineAssetBinding> timelineBindingsByAlias)) {
                    return 1;
                }

                UnitySampleBindingTemplateWriter writer = new UnitySampleBindingTemplateWriter();
                WriteOrPrint(outputPath, writer.Write(result.Graph, timelineBindingsByAlias));
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-unity-sample-role-template") {
                if (!TryReadUnitySampleRoleNameBindingsForTemplate(args,
                                                            config,
                                                            out Dictionary<string, int> roleIdsBySpeaker,
                                                            out Dictionary<string, List<UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                            out bool scannedRoleNameCsv)) {
                    return 1;
                }

                UnitySampleRoleTemplateWriter writer = new UnitySampleRoleTemplateWriter();
                WriteOrPrint(outputPath, writer.Write(result.Graph, roleIdsBySpeaker));
                string? reportPath = ReadOption(args, "--report");
                if (!string.IsNullOrWhiteSpace(reportPath)) {
                    WriteOrPrint(reportPath, WriteUnitySampleRoleTemplateReport(result.Graph, roleIdsBySpeaker, candidatesBySpeaker, scannedRoleNameCsv));
                }
                PrintDiagnostics(result.Diagnostics);
                return result.HasErrors ? 1 : 0;
            }

            if (command == "export-unity-sample-project") {
                if (string.IsNullOrWhiteSpace(outputPath)) {
                    Console.Error.WriteLine("Missing required option: -o <output-directory>");
                    return 1;
                }

                UnitySampleProjectExporter exporter = new UnitySampleProjectExporter();
                if (!TryReadUnitySampleExportOptions(args, config, out UnitySampleExportOptions options)) {
                    return 1;
                }
                UnitySampleExportResult export = exporter.Export(result, options);
                WriteUnitySampleExport(outputPath, export);
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

        static bool TryReadProjectConfig(string rootPath, string[] args, out ProjectConfig config) {
            config = new ProjectConfig();
            string? configuredPath = ReadOption(args, "--config");
            string configPath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(Path.GetFullPath(rootPath), "inscape.config.json")
                : Path.GetFullPath(configuredPath);
            if (!File.Exists(configPath)) {
                if (string.IsNullOrWhiteSpace(configuredPath)) {
                    return true;
                }

                Console.Error.WriteLine("Project config not found: " + configPath);
                return false;
            }

            try {
                ProjectConfig? parsed = JsonSerializer.Deserialize<ProjectConfig>(File.ReadAllText(configPath, Encoding.UTF8), JsonOptions);
                config = parsed ?? new ProjectConfig();
                NormalizeProjectConfigPaths(config, configPath);
                return true;
            } catch (Exception ex) {
                Console.Error.WriteLine("Invalid project config '" + configPath + "': " + ex.Message);
                return false;
            }
        }

        static void NormalizeProjectConfigPaths(ProjectConfig config, string configPath) {
            string configDirectory = Path.GetDirectoryName(configPath) ?? Directory.GetCurrentDirectory();
            config.HostSchema = ResolveConfigPath(configDirectory, config.HostSchema);
            config.UnitySample.RoleMap = ResolveConfigPath(configDirectory, config.UnitySample.RoleMap);
            config.UnitySample.BindingMap = ResolveConfigPath(configDirectory, config.UnitySample.BindingMap);
            config.UnitySample.ExistingRoleNameCsv = ResolveConfigPath(configDirectory, config.UnitySample.ExistingRoleNameCsv);
            config.UnitySample.ExistingTimelineRoot = ResolveConfigPath(configDirectory, config.UnitySample.ExistingTimelineRoot);
            config.UnitySample.ExistingTalkingRoot = ResolveConfigPath(configDirectory, config.UnitySample.ExistingTalkingRoot);
        }

        static string? ResolveConfigPath(string configDirectory, string? value) {
            if (string.IsNullOrWhiteSpace(value)) {
                return null;
            }

            if (Path.IsPathRooted(value)) {
                return value;
            }

            return Path.GetFullPath(Path.Combine(configDirectory, value));
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
                || command == "export-unity-sample-binding-template"
                || command == "export-unity-sample-role-template"
                || command == "export-unity-sample-project";
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

        static int RunMergeUnitySampleL10n(string generatedPath, string? existingPath, string? reportPath, string? outputPath) {
            if (!File.Exists(generatedPath)) {
                Console.Error.WriteLine("Generated UnitySample L10N CSV not found: " + generatedPath);
                return 1;
            }

            if (string.IsNullOrWhiteSpace(existingPath)) {
                Console.Error.WriteLine("Missing required option: --from <existing-L10N_Talking.csv>");
                return 1;
            }

            if (!File.Exists(existingPath)) {
                Console.Error.WriteLine("Existing UnitySample L10N CSV not found: " + existingPath);
                return 1;
            }

            try {
                UnitySampleL10nMergePlanner planner = new UnitySampleL10nMergePlanner();
                UnitySampleL10nMergeResult result = planner.Merge(File.ReadAllText(existingPath, Encoding.UTF8),
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

        static void WriteUnitySampleExport(string outputDirectory, UnitySampleExportResult export) {
            string fullDirectory = Path.GetFullPath(outputDirectory);
            Directory.CreateDirectory(fullDirectory);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-manifest.json"),
                              JsonSerializer.Serialize(export.Manifest, JsonOptions),
                              Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "L10N_Talking.csv"), export.L10nTalkingCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "inscape-unity-sample-l10n-map.csv"), export.AnchorMapCsv, Encoding.UTF8);
            File.WriteAllText(Path.Combine(fullDirectory, "unity-sample-export-report.txt"), export.ReportText, Encoding.UTF8);
        }

        static bool TryReadUnitySampleExportOptions(string[] args, ProjectConfig config, out UnitySampleExportOptions options) {
            options = new UnitySampleExportOptions {
                TalkingIdStart = ReadIntOption(args, "--unity-sample-talking-start", config.UnitySample.TalkingIdStart ?? 100000),
            };

            string? roleMapPath = ReadOption(args, "--unity-sample-role-map") ?? config.UnitySample.RoleMap;
            if (!string.IsNullOrWhiteSpace(roleMapPath)) {
                if (!TryReadUnitySampleRoleMap(roleMapPath, options)) {
                    return false;
                }
            }

            string? bindingMapPath = ReadOption(args, "--unity-sample-binding-map") ?? config.UnitySample.BindingMap;
            if (!string.IsNullOrWhiteSpace(bindingMapPath)) {
                if (!TryReadUnitySampleBindingMap(bindingMapPath, options)) {
                    return false;
                }
            }

            return TryReadReservedTalkingIds(args, config, options);
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

        static bool TryReadUnitySampleTimelineBindingsForTemplate(string[] args, ProjectConfig config, out Dictionary<string, UnitySampleTimelineAssetBinding> bindingsByAlias) {
            bindingsByAlias = new Dictionary<string, UnitySampleTimelineAssetBinding>(StringComparer.Ordinal);
            string? timelineRoot = ReadOption(args, "--unity-sample-existing-timeline-root") ?? config.UnitySample.ExistingTimelineRoot;
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

        static bool TryReadUnitySampleRoleNameBindingsForTemplate(string[] args,
                                                           ProjectConfig config,
                                                           out Dictionary<string, int> roleIdsBySpeaker,
                                                           out Dictionary<string, List<UnitySampleRoleNameCandidate>> candidatesBySpeaker,
                                                           out bool scannedRoleNameCsv) {
            roleIdsBySpeaker = new Dictionary<string, int>(StringComparer.Ordinal);
            candidatesBySpeaker = new Dictionary<string, List<UnitySampleRoleNameCandidate>>(StringComparer.Ordinal);
            scannedRoleNameCsv = false;
            string? roleNameCsvPath = ReadOption(args, "--unity-sample-existing-role-name-csv") ?? config.UnitySample.ExistingRoleNameCsv;
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

        static string WriteUnitySampleRoleTemplateReport(InscapeDocument graph,
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

        static string CreateHostSchemaTemplateJson() {
            HostSchemaTemplate template = new HostSchemaTemplate {
                Queries = new List<HostSchemaQuery> {
                    new HostSchemaQuery {
                        Name = "has_item",
                        Description = "Pure query example. The DSL may reference it later, but the host owns execution.",
                        ReturnType = "bool",
                        IsAsync = false,
                        Parameters = new List<HostSchemaParameter> {
                            new HostSchemaParameter {
                                Name = "itemId",
                                Type = "string",
                                Required = true,
                                Description = "Stable item identifier owned by the host."
                            }
                        }
                    }
                },
                Events = new List<HostSchemaEvent> {
                    new HostSchemaEvent {
                        Name = "open_window",
                        Description = "Host event example. Inscape only records the intent; the host decides behavior.",
                        Delivery = "fire-and-forget",
                        SideEffects = true,
                        Parameters = new List<HostSchemaParameter> {
                            new HostSchemaParameter {
                                Name = "windowId",
                                Type = "string",
                                Required = true,
                                Description = "Stable UI window identifier owned by the host."
                            }
                        }
                    }
                }
            };

            return JsonSerializer.Serialize(template, JsonOptions);
        }

        static bool TryReadReservedTalkingIds(string[] args, ProjectConfig config, UnitySampleExportOptions options) {
            string? talkingRoot = ReadOption(args, "--unity-sample-existing-talking-root") ?? config.UnitySample.ExistingTalkingRoot;
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
            Console.WriteLine("  inscape export-host-schema-template [-o inscape.host.schema.json]");
            Console.WriteLine("  inscape check <file.inscape>");
            Console.WriteLine("  inscape diagnose <file.inscape> [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n <file.inscape> [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]");
            Console.WriteLine("  inscape check-project <root> [--entry node.name]");
            Console.WriteLine("  inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape export-unity-sample-binding-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-timeline-root path] [-o bindings.csv]");
            Console.WriteLine("  inscape export-unity-sample-role-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-role-name-csv path] [--report report.csv] [-o roles.csv]");
            Console.WriteLine("  inscape export-unity-sample-project <root> [--config inscape.config.json] [--entry node.name] [--unity-sample-talking-start 100000] [--unity-sample-role-map roles.csv] [--unity-sample-binding-map bindings.csv] [--unity-sample-existing-talking-root path] -o output-dir");
            Console.WriteLine("  inscape merge-unity-sample-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]");
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
            Console.WriteLine("Host schema:");
            Console.WriteLine("  export-host-schema-template");
            Console.WriteLine();
            Console.WriteLine("Project:");
            Console.WriteLine("  check-project");
            Console.WriteLine("  diagnose-project");
            Console.WriteLine("  compile-project");
            Console.WriteLine("  preview-project");
            Console.WriteLine("  extract-l10n-project");
            Console.WriteLine("  update-l10n-project");
            Console.WriteLine();
            Console.WriteLine("UnitySample:");
            Console.WriteLine("  export-unity-sample-role-template");
            Console.WriteLine("  export-unity-sample-binding-template");
            Console.WriteLine("  export-unity-sample-project");
            Console.WriteLine("  merge-unity-sample-l10n");
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
                case "export-host-schema-template":
                    PrintCommandHelpBlock("export-host-schema-template",
                                          "Write a first host schema template for pure queries and host events.",
                                          "inscape export-host-schema-template [-o inscape.host.schema.json]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-host-schema-template -o config\\inscape.host.schema.json",
                                          "The template is a versioned design scaffold. It does not change current DSL parsing or UnitySample export behavior.");
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
                case "export-unity-sample-role-template":
                    PrintCommandHelpBlock("export-unity-sample-role-template",
                                          "Scan project dialogue speakers and write a UnitySample role binding template.",
                                          "inscape export-unity-sample-role-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-role-name-csv path] [--report report.csv] [-o roles.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-role-template samples --unity-sample-existing-role-name-csv D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Localization\\L10N_RoleName.csv --report artifacts\\unity-sample-export\\unity-sample-roles.report.csv -o config\\unity-sample-roles.csv",
                                          "Output CSV: speaker,roleId. Optional report statuses: unique, ambiguous, missing, unscanned.");
                    return true;
                case "export-unity-sample-binding-template":
                    PrintCommandHelpBlock("export-unity-sample-binding-template",
                                          "Scan Timeline hooks and write a UnitySample host binding template.",
                                          "inscape export-unity-sample-binding-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-timeline-root path] [-o bindings.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-binding-template samples --unity-sample-existing-timeline-root D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Timeline -o config\\unity-sample-bindings.csv",
                                          "Output CSV: kind,alias,unitySampleId,unityGuid,addressableKey,assetPath");
                    return true;
                case "export-unity-sample-project":
                    PrintCommandHelpBlock("export-unity-sample-project",
                                          "Export project IR to UnitySample manifest, UnitySample L10N CSV, anchor map, and report.",
                                          "inscape export-unity-sample-project <root> [--config inscape.config.json] [--entry node.name] [--unity-sample-talking-start 100000] [--unity-sample-role-map roles.csv] [--unity-sample-binding-map bindings.csv] [--unity-sample-existing-talking-root path] -o output-dir",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-project samples --unity-sample-role-map config\\unity-sample-roles.csv --unity-sample-binding-map config\\unity-sample-bindings.csv -o artifacts\\unity-sample-export",
                                          "Output files: unity-sample-manifest.json, L10N_Talking.csv, inscape-unity-sample-l10n-map.csv, unity-sample-export-report.txt");
                    return true;
                case "merge-unity-sample-l10n":
                    PrintCommandHelpBlock("merge-unity-sample-l10n",
                                          "Merge generated Inscape UnitySample L10N_Talking.csv into an existing UnitySample L10N_Talking.csv without silently reusing stale translations.",
                                          "inscape merge-unity-sample-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]",
                                          "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- merge-unity-sample-l10n artifacts\\unity-sample-export\\L10N_Talking.csv --from D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Localization\\L10N_Talking.csv --report artifacts\\unity-sample-export\\L10N_Talking.merge-report.csv -o artifacts\\unity-sample-export\\L10N_Talking.merged.csv",
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

        sealed class UnitySampleRoleNameCandidate {

            public int RoleId { get; }

            public string Description { get; }

            public string Language { get; }

            public UnitySampleRoleNameCandidate(int roleId, string description, string language) {
                RoleId = roleId;
                Description = description;
                Language = language;
            }

        }

        sealed class ProjectConfig {

            public string? HostSchema { get; set; }

            public UnitySampleProjectConfig UnitySample { get; set; } = new UnitySampleProjectConfig();

        }

        sealed class UnitySampleProjectConfig {

            public string? RoleMap { get; set; }

            public string? BindingMap { get; set; }

            public string? ExistingRoleNameCsv { get; set; }

            public string? ExistingTimelineRoot { get; set; }

            public string? ExistingTalkingRoot { get; set; }

            public int? TalkingIdStart { get; set; }

        }

        sealed class HostSchemaTemplate {

            public string Format { get; set; } = "inscape.host-schema";

            public int FormatVersion { get; set; } = 1;

            public List<HostSchemaQuery> Queries { get; set; } = new List<HostSchemaQuery>();

            public List<HostSchemaEvent> Events { get; set; } = new List<HostSchemaEvent>();

        }

        sealed class HostSchemaQuery {

            public string Name { get; set; } = string.Empty;

            public string Description { get; set; } = string.Empty;

            public string ReturnType { get; set; } = string.Empty;

            public bool IsAsync { get; set; }

            public List<HostSchemaParameter> Parameters { get; set; } = new List<HostSchemaParameter>();

        }

        sealed class HostSchemaEvent {

            public string Name { get; set; } = string.Empty;

            public string Description { get; set; } = string.Empty;

            public string Delivery { get; set; } = string.Empty;

            public bool SideEffects { get; set; }

            public List<HostSchemaParameter> Parameters { get; set; } = new List<HostSchemaParameter>();

        }

        sealed class HostSchemaParameter {

            public string Name { get; set; } = string.Empty;

            public string Type { get; set; } = string.Empty;

            public bool Required { get; set; }

            public string Description { get; set; } = string.Empty;

        }

    }

}
