using System.Globalization;
using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageExportDomain {

        const string ManifestFileName = "manifest.json";
        const string ProjectIrPath = "graph/project-ir.json";
        const string UsageManifestPath = "usage/usage.json";
        const string HostSchemaCapabilitiesPath = "host/host-schema-capabilities.json";
        const string HostIntegrationAuditPath = "host/host-integration-audit.json";
        const string LocalizationCsvPath = "localization/l10n.csv";
        const string SourceRootPath = "source";
        const string SourceLocationsPath = "source-map/source-locations.json";
        const string LocalizationAnchorMapPath = "localization/anchor-map.json";
        const string ReadinessReportPath = "reports/readiness-report.json";

        public static bool TryWriteManifest(HostIntegrationPackageExportRequestModel request,
                                            JsonSerializerOptions jsonOptions,
                                            out HostIntegrationPackageExportResultModel result,
                                            out string? errorMessage,
                                            out int exitCode) {
            result = new HostIntegrationPackageExportResultModel();
            errorMessage = null;
            exitCode = 0;

            if (string.IsNullOrWhiteSpace(request.WorkspaceRootPath) || !Directory.Exists(request.WorkspaceRootPath)) {
                errorMessage = "Project root not found: " + request.WorkspaceRootPath;
                exitCode = 3;
                return false;
            }

            if (string.IsNullOrWhiteSpace(request.OutputDirectoryPath)) {
                errorMessage = "export-host-integration-package-project requires -o <out-dir>.";
                exitCode = 2;
                return false;
            }

            string fullOutputPath = Path.GetFullPath(request.OutputDirectoryPath);
            if (File.Exists(fullOutputPath)) {
                errorMessage = "Host Integration Package output path must be a directory, not a file: " + fullOutputPath;
                exitCode = 2;
                return false;
            }

            if (!TryCreateAssemblyContext(request,
                                          jsonOptions,
                                          out HostIntegrationPackageAssemblyContext context,
                                          out errorMessage,
                                          out exitCode)) {
                return false;
            }

            string manifestPath = Path.Combine(fullOutputPath, ManifestFileName);
            string createdAtUtc = ResolveCreatedAtUtc(manifestPath, jsonOptions);
            HostIntegrationPackageManifestModel manifest = HostIntegrationPackageManifestDomain.Create(request.WorkspaceRootPath,
                                                                                                      createdAtUtc);
            HashSet<string> writableArtifactPaths = CreateWritableArtifactPathSet(context);
            if (!EnsureWritablePackageDirectory(fullOutputPath, writableArtifactPaths, out errorMessage)) {
                exitCode = 2;
                return false;
            }

            List<string> writtenArtifacts = WritePackageArtifacts(context,
                                                                  fullOutputPath,
                                                                  jsonOptions,
                                                                  manifest,
                                                                  createdAtUtc);

            string json = JsonSerializer.Serialize(manifest, jsonOptions);
            File.WriteAllText(manifestPath, json + Environment.NewLine, new UTF8Encoding(false));
            writtenArtifacts.Insert(0, HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ManifestFileName));

            result = new HostIntegrationPackageExportResultModel {
                OutputDirectoryPath = fullOutputPath,
                ManifestPath = manifestPath,
                Manifest = manifest,
                WrittenArtifacts = writtenArtifacts,
            };
            return true;
        }

        static bool TryCreateAssemblyContext(HostIntegrationPackageExportRequestModel request,
                                             JsonSerializerOptions jsonOptions,
                                             out HostIntegrationPackageAssemblyContext context,
                                             out string? errorMessage,
                                             out int exitCode) {
            context = new HostIntegrationPackageAssemblyContext();
            errorMessage = null;
            exitCode = 0;

            if (!ToolConfigReaderDomain.TryReadProjectConfig(request.WorkspaceRootPath,
                                                             request.ConfiguredConfigPath,
                                                             jsonOptions,
                                                             out ToolConfigModel config,
                                                             out errorMessage)) {
                exitCode = 3;
                return false;
            }

            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(request.WorkspaceRootPath, null);
            if (sources.Count == 0) {
                errorMessage = "No .inscape files found under: " + request.WorkspaceRootPath;
                exitCode = 3;
                return false;
            }

            context.WorkspaceRootPath = Path.GetFullPath(request.WorkspaceRootPath);
            context.ConfiguredConfigPath = request.ConfiguredConfigPath;
            context.Config = config;
            context.Sources = sources;

            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            context.Compilation = compiler.Compile(sources, context.WorkspaceRootPath);

            context.HostSchemaCatalog = HostSchemaCapabilityCatalogDomain.Read(request.WorkspaceRootPath,
                                                                               config.HostSchema,
                                                                               jsonOptions);

            context.Usage = UsageManifestDomain.Inspect(request.WorkspaceRootPath,
                                                        request.ConfiguredConfigPath,
                                                        sources,
                                                        context.HostSchemaCatalog);

            context.HostBindingCatalog = HostBindingCapabilityCatalogDomain.Read(request.WorkspaceRootPath,
                                                                                 config.HostBridge,
                                                                                 sources);
            context.Audit = HostIntegrationAuditDomain.Audit(request.WorkspaceRootPath,
                                                             request.ConfiguredConfigPath,
                                                             context.Usage,
                                                             context.HostSchemaCatalog,
                                                             context.HostBindingCatalog);

            LocalizationExtractorDomain localizationExtractor = new LocalizationExtractorDomain();
            context.LocalizationEntries = localizationExtractor.Extract(context.Compilation.Graph);
            context.PackagedLocalizationEntries = CreatePackagedLocalizationEntries(context);
            return true;
        }

        static List<string> WritePackageArtifacts(HostIntegrationPackageAssemblyContext context,
                                                  string fullOutputPath,
                                                  JsonSerializerOptions jsonOptions,
                                                  HostIntegrationPackageManifestModel manifest,
                                                  string createdAtUtc) {
            List<string> writtenArtifacts = new List<string>();

            WriteJsonArtifact(fullOutputPath,
                              ProjectIrPath,
                              CreateProjectIrArtifact(context.Compilation),
                              jsonOptions,
                              manifest,
                              writtenArtifacts);
            WriteJsonArtifact(fullOutputPath,
                              HostSchemaCapabilitiesPath,
                              context.HostSchemaCatalog,
                              jsonOptions,
                              manifest,
                              writtenArtifacts);
            WriteJsonArtifact(fullOutputPath,
                              UsageManifestPath,
                              context.Usage,
                              jsonOptions,
                              manifest,
                              writtenArtifacts);
            WriteJsonArtifact(fullOutputPath,
                              HostIntegrationAuditPath,
                              context.Audit,
                              jsonOptions,
                              manifest,
                              writtenArtifacts);

            LocalizationCsvWriterDomain localizationCsvWriter = new LocalizationCsvWriterDomain();
            WriteTextArtifact(fullOutputPath,
                              LocalizationCsvPath,
                              localizationCsvWriter.Write(context.PackagedLocalizationEntries),
                              manifest,
                              writtenArtifacts);

            WriteSourceArtifacts(context, fullOutputPath, manifest, writtenArtifacts);
            HostIntegrationPackageSourceLocationsModel sourceLocations = CreateSourceLocations(context);
            WriteJsonArtifact(fullOutputPath,
                              SourceLocationsPath,
                              sourceLocations,
                              jsonOptions,
                              manifest,
                              writtenArtifacts);
            WriteJsonArtifact(fullOutputPath,
                              LocalizationAnchorMapPath,
                              CreateLocalizationAnchorMap(context),
                              jsonOptions,
                              manifest,
                              writtenArtifacts);

            HostIntegrationPackageManifestDomain.TrySetArtifactStatus(manifest, ReadinessReportPath, "ready");
            WriteJsonArtifact(fullOutputPath,
                              ReadinessReportPath,
                              HostIntegrationPackageReadinessReportDomain.CreateFromManifest(manifest,
                                                                                             createdAtUtc,
                                                                                             HostIntegrationPackageReadinessReportDomain.CreateDiagnostics(context.Compilation.Diagnostics,
                                                                                                                                                            context.Audit.Diagnostics,
                                                                                                                                                            sourcePath => CreatePackageSourcePath(context, sourcePath))),
                              jsonOptions,
                              manifest,
                              writtenArtifacts);
            return writtenArtifacts;
        }

        static HostIntegrationPackageProjectIrArtifactModel CreateProjectIrArtifact(StoryGraphCompilationResultModel result) {
            return new HostIntegrationPackageProjectIrArtifactModel {
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

        static List<LocalizationEntryModel> CreatePackagedLocalizationEntries(HostIntegrationPackageAssemblyContext context) {
            List<LocalizationEntryModel> entries = new List<LocalizationEntryModel>();
            for (int i = 0; i < context.LocalizationEntries.Count; i += 1) {
                LocalizationEntryModel entry = context.LocalizationEntries[i];
                entries.Add(new LocalizationEntryModel {
                    Anchor = entry.Anchor,
                    NodeName = entry.NodeName,
                    Kind = entry.Kind,
                    Speaker = entry.Speaker,
                    Text = entry.Text,
                    Translation = entry.Translation,
                    Status = entry.Status,
                    Source = new SourceSpanModel(CreatePackageSourcePath(context, entry.Source.SourcePath),
                                                 entry.Source.Line,
                                                 entry.Source.Column),
                });
            }

            return entries;
        }

        static void WriteSourceArtifacts(HostIntegrationPackageAssemblyContext context,
                                         string fullOutputPath,
                                         HostIntegrationPackageManifestModel manifest,
                                         List<string> writtenArtifacts) {
            for (int i = 0; i < context.Sources.Count; i += 1) {
                DslScriptSourceModel source = context.Sources[i];
                string packagePath = CreatePackageSourcePath(context, source.SourcePath);
                string artifactPath = ResolvePackageFilePath(fullOutputPath, packagePath);
                Directory.CreateDirectory(Path.GetDirectoryName(artifactPath) ?? fullOutputPath);
                File.WriteAllText(artifactPath, source.Source, new UTF8Encoding(false));
                writtenArtifacts.Add(packagePath);
            }

            HostIntegrationPackageManifestDomain.TrySetArtifactStatus(manifest, SourceRootPath, "ready");
        }

        static HostIntegrationPackageSourceLocationsModel CreateSourceLocations(HostIntegrationPackageAssemblyContext context) {
            HostIntegrationPackageSourceLocationsModel model = new HostIntegrationPackageSourceLocationsModel();
            Dictionary<string, string> sourceIdsByFullPath = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < context.Sources.Count; i += 1) {
                DslScriptSourceModel source = context.Sources[i];
                string id = CreateSequentialId("src", model.Sources.Count + 1);
                string fullSourcePath = Path.GetFullPath(source.SourcePath);
                sourceIdsByFullPath[fullSourcePath] = id;
                model.Sources.Add(new HostIntegrationPackageSourceLocationSourceModel {
                    Id = id,
                    Path = CreatePackageSourcePath(context, source.SourcePath),
                    WorkspacePath = CreateWorkspaceRelativePath(context.WorkspaceRootPath, source.SourcePath),
                    Availability = "packaged",
                });
            }

            for (int nodeIndex = 0; nodeIndex < context.Compilation.Graph.Nodes.Count; nodeIndex += 1) {
                StoryGraphNodeModel node = context.Compilation.Graph.Nodes[nodeIndex];
                AddSourceLocation(model,
                                  sourceIdsByFullPath,
                                  context,
                                  node.Source,
                                  "graph-node",
                                  "narrative-graph-ir",
                                  ProjectIrPath,
                                  null,
                                  "graph.nodes[" + nodeIndex.ToString(CultureInfo.InvariantCulture) + "]",
                                  Math.Max(node.Name.Length, 1));
            }

            for (int entryIndex = 0; entryIndex < context.LocalizationEntries.Count; entryIndex += 1) {
                LocalizationEntryModel entry = context.LocalizationEntries[entryIndex];
                AddSourceLocation(model,
                                  sourceIdsByFullPath,
                                  context,
                                  entry.Source,
                                  "localization-row",
                                  "localization-csv",
                                  LocalizationCsvPath,
                                  entry.Anchor,
                                  null,
                                  Math.Max(entry.Text.Length, 1));
            }

            return model;
        }

        static void AddSourceLocation(HostIntegrationPackageSourceLocationsModel model,
                                      Dictionary<string, string> sourceIdsByFullPath,
                                      HostIntegrationPackageAssemblyContext context,
                                      SourceSpanModel source,
                                      string role,
                                      string artifactKind,
                                      string artifactPath,
                                      string? rowKey,
                                      string? objectPath,
                                      int length) {
            if (string.IsNullOrWhiteSpace(source.SourcePath) || source.Line <= 0 || source.Column <= 0) {
                return;
            }

            string sourceId = ResolveSourceId(model, sourceIdsByFullPath, context, source.SourcePath);
            model.Locations.Add(new HostIntegrationPackageSourceLocationModel {
                Id = CreateSequentialId("loc", model.Locations.Count + 1),
                SourceId = sourceId,
                Line = source.Line,
                Column = source.Column,
                Length = Math.Max(length, 1),
                Role = role,
                Artifact = new HostIntegrationPackageSourceLocationArtifactModel {
                    Kind = artifactKind,
                    Path = HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(artifactPath),
                    RowKey = rowKey,
                    ObjectPath = objectPath,
                },
            });
        }

        static string ResolveSourceId(HostIntegrationPackageSourceLocationsModel model,
                                      Dictionary<string, string> sourceIdsByFullPath,
                                      HostIntegrationPackageAssemblyContext context,
                                      string sourcePath) {
            string fullSourcePath = Path.GetFullPath(sourcePath);
            if (sourceIdsByFullPath.TryGetValue(fullSourcePath, out string? sourceId)) {
                return sourceId;
            }

            string id = CreateSequentialId("src", model.Sources.Count + 1);
            sourceIdsByFullPath[fullSourcePath] = id;
            model.Sources.Add(new HostIntegrationPackageSourceLocationSourceModel {
                Id = id,
                Path = CreatePackageSourcePath(context, sourcePath),
                WorkspacePath = CreateWorkspaceRelativePath(context.WorkspaceRootPath, sourcePath),
                Availability = "packaged",
            });
            return id;
        }

        static HostIntegrationPackageLocalizationAnchorMapModel CreateLocalizationAnchorMap(HostIntegrationPackageAssemblyContext context) {
            HostIntegrationPackageLocalizationAnchorMapModel model = new HostIntegrationPackageLocalizationAnchorMapModel {
                Csv = LocalizationCsvPath,
            };

            for (int i = 0; i < context.PackagedLocalizationEntries.Count; i += 1) {
                LocalizationEntryModel entry = context.PackagedLocalizationEntries[i];
                model.Entries.Add(new HostIntegrationPackageLocalizationAnchorEntryModel {
                    Anchor = entry.Anchor,
                    NodeTitle = entry.NodeName,
                    Kind = entry.Kind,
                    Speaker = entry.Speaker,
                    Text = entry.Text,
                    Source = new HostIntegrationPackageSourceRefModel {
                        Path = entry.Source.SourcePath,
                        Line = entry.Source.Line,
                        Column = entry.Source.Column,
                        CoordinateSystem = "compiler-1-based",
                    },
                    GraphRef = new HostIntegrationPackageLocalizationGraphRefModel {
                        Artifact = ProjectIrPath,
                        NodeName = entry.NodeName,
                        LineAnchor = entry.Anchor,
                    },
                    LineIdentity = new HostIntegrationPackageLocalizationLineIdentityModel {
                        Status = "missing",
                    },
                    PartnerRefs = new List<object>(),
                });
            }

            return model;
        }

        static void WriteJsonArtifact(string fullOutputPath,
                                      string packagePath,
                                      object artifact,
                                      JsonSerializerOptions jsonOptions,
                                      HostIntegrationPackageManifestModel manifest,
                                      List<string> writtenArtifacts) {
            string normalizedPath = HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(packagePath);
            string artifactPath = ResolvePackageFilePath(fullOutputPath, normalizedPath);
            Directory.CreateDirectory(Path.GetDirectoryName(artifactPath) ?? fullOutputPath);
            File.WriteAllText(artifactPath, JsonSerializer.Serialize(artifact, jsonOptions) + Environment.NewLine, new UTF8Encoding(false));
            HostIntegrationPackageManifestDomain.TrySetArtifactStatus(manifest, normalizedPath, "ready");
            writtenArtifacts.Add(normalizedPath);
        }

        static void WriteTextArtifact(string fullOutputPath,
                                      string packagePath,
                                      string text,
                                      HostIntegrationPackageManifestModel manifest,
                                      List<string> writtenArtifacts) {
            string normalizedPath = HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(packagePath);
            string artifactPath = ResolvePackageFilePath(fullOutputPath, normalizedPath);
            Directory.CreateDirectory(Path.GetDirectoryName(artifactPath) ?? fullOutputPath);
            File.WriteAllText(artifactPath, text, new UTF8Encoding(false));
            HostIntegrationPackageManifestDomain.TrySetArtifactStatus(manifest, normalizedPath, "ready");
            writtenArtifacts.Add(normalizedPath);
        }

        static string ResolvePackageFilePath(string fullOutputPath, string packagePath) {
            string fullRoot = Path.GetFullPath(fullOutputPath);
            string candidate = Path.GetFullPath(Path.Combine(fullRoot, packagePath.Replace('/', Path.DirectorySeparatorChar)));
            string rootPrefix = fullRoot.EndsWith(Path.DirectorySeparatorChar)
                ? fullRoot
                : fullRoot + Path.DirectorySeparatorChar;
            if (!candidate.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)) {
                throw new InvalidOperationException("Package artifact path escaped output directory: " + packagePath);
            }

            return candidate;
        }

        static string CreatePackageSourcePath(HostIntegrationPackageAssemblyContext context, string sourcePath) {
            return HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(SourceRootPath + "/" + CreateWorkspaceRelativePath(context.WorkspaceRootPath, sourcePath));
        }

        static string CreateWorkspaceRelativePath(string workspaceRootPath, string sourcePath) {
            string fullWorkspacePath = Path.GetFullPath(workspaceRootPath);
            string fullSourcePath = Path.GetFullPath(sourcePath);
            string relativePath = Path.GetRelativePath(fullWorkspacePath, fullSourcePath);
            if (relativePath.StartsWith("..", StringComparison.Ordinal) || Path.IsPathRooted(relativePath)) {
                relativePath = Path.GetFileName(fullSourcePath);
            }

            return HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(relativePath);
        }

        static string CreateSequentialId(string prefix, int value) {
            return prefix + "_" + value.ToString("000", CultureInfo.InvariantCulture);
        }

        static bool EnsureWritablePackageDirectory(string fullOutputPath,
                                                   HashSet<string> writableArtifactPaths,
                                                   out string? errorMessage) {
            errorMessage = null;
            if (!Directory.Exists(fullOutputPath)) {
                Directory.CreateDirectory(fullOutputPath);
                return true;
            }

            foreach (string entry in Directory.EnumerateFileSystemEntries(fullOutputPath, "*", SearchOption.AllDirectories)) {
                if (!IsWritablePackageEntry(fullOutputPath, entry, writableArtifactPaths)) {
                    errorMessage = "Host Integration Package output directory contains non-package files: " + fullOutputPath;
                    return false;
                }
            }

            return true;
        }

        static bool IsWritablePackageEntry(string fullOutputPath,
                                           string entryPath,
                                           HashSet<string> writableArtifactPaths) {
            string relativePath = Path.GetRelativePath(fullOutputPath, entryPath);
            string normalizedPath = HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(relativePath);
            if (File.Exists(entryPath)) {
                return writableArtifactPaths.Contains(normalizedPath);
            }

            if (Directory.Exists(entryPath)) {
                return IsWritablePackageDirectory(normalizedPath, writableArtifactPaths);
            }

            return false;
        }

        static bool IsWritablePackageDirectory(string normalizedPath, HashSet<string> writableArtifactPaths) {
            string prefix = normalizedPath + "/";
            foreach (string artifactPath in writableArtifactPaths) {
                if (artifactPath.StartsWith(prefix, StringComparison.Ordinal)) {
                    return true;
                }
            }

            return false;
        }

        static HashSet<string> CreateWritableArtifactPathSet(HostIntegrationPackageAssemblyContext context) {
            HashSet<string> paths = new HashSet<string>(StringComparer.Ordinal) {
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ManifestFileName),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ProjectIrPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(UsageManifestPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(HostSchemaCapabilitiesPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(HostIntegrationAuditPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(LocalizationCsvPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(SourceLocationsPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(LocalizationAnchorMapPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ReadinessReportPath),
            };

            for (int i = 0; i < context.Sources.Count; i += 1) {
                paths.Add(CreatePackageSourcePath(context, context.Sources[i].SourcePath));
            }

            return paths;
        }

        static string ResolveCreatedAtUtc(string manifestPath, JsonSerializerOptions jsonOptions) {
            if (File.Exists(manifestPath)) {
                try {
                    HostIntegrationPackageManifestModel? existing = JsonSerializer.Deserialize<HostIntegrationPackageManifestModel>(File.ReadAllText(manifestPath, Encoding.UTF8),
                                                                                                                                   jsonOptions);
                    if (!string.IsNullOrWhiteSpace(existing?.CreatedAtUtc)) {
                        return existing.CreatedAtUtc;
                    }
                } catch (JsonException) {
                    // Invalid previous manifests are overwritten by the next valid manifest.
                }
            }

            return DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
        }

        sealed class HostIntegrationPackageAssemblyContext {

            public string WorkspaceRootPath { get; set; } = string.Empty;

            public string? ConfiguredConfigPath { get; set; }

            public ToolConfigModel Config { get; set; } = new ToolConfigModel();

            public List<DslScriptSourceModel> Sources { get; set; } = new List<DslScriptSourceModel>();

            public StoryGraphCompilationResultModel Compilation { get; set; } = null!;

            public HostSchemaCapabilityCatalogModel HostSchemaCatalog { get; set; } = new HostSchemaCapabilityCatalogModel();

            public UsageManifestModel Usage { get; set; } = new UsageManifestModel();

            public HostBindingCapabilityCatalogModel HostBindingCatalog { get; set; } = new HostBindingCapabilityCatalogModel();

            public HostIntegrationAuditModel Audit { get; set; } = new HostIntegrationAuditModel();

            public List<LocalizationEntryModel> LocalizationEntries { get; set; } = new List<LocalizationEntryModel>();

            public List<LocalizationEntryModel> PackagedLocalizationEntries { get; set; } = new List<LocalizationEntryModel>();

        }

    }

}
