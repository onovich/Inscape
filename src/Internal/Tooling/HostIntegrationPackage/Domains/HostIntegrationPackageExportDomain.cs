using System.Globalization;
using System.Text;
using System.Text.Json;
using Inscape.Compiler.Compilation;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageExportDomain {

        const string ManifestFileName = "manifest.json";
        const string ProjectIrPath = "graph/project-ir.json";
        const string UsageManifestPath = "usage/usage.json";
        const string HostSchemaCapabilitiesPath = "host/host-schema-capabilities.json";
        const string HostIntegrationAuditPath = "host/host-integration-audit.json";
        const string LocalizationCsvPath = "localization/l10n.csv";

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

            string manifestPath = Path.Combine(fullOutputPath, ManifestFileName);
            string createdAtUtc = ResolveCreatedAtUtc(manifestPath, jsonOptions);
            HostIntegrationPackageManifestModel manifest = HostIntegrationPackageManifestDomain.Create(request.WorkspaceRootPath,
                                                                                                      createdAtUtc);
            HashSet<string> writableArtifactPaths = CreateWritableArtifactPathSet();
            if (!EnsureWritablePackageDirectory(fullOutputPath, writableArtifactPaths, out errorMessage)) {
                exitCode = 2;
                return false;
            }

            if (!TryAssembleCoreArtifacts(request,
                                          fullOutputPath,
                                          jsonOptions,
                                          manifest,
                                          out List<string> writtenArtifacts,
                                          out errorMessage,
                                          out exitCode)) {
                return false;
            }

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

        static bool TryAssembleCoreArtifacts(HostIntegrationPackageExportRequestModel request,
                                             string fullOutputPath,
                                             JsonSerializerOptions jsonOptions,
                                             HostIntegrationPackageManifestModel manifest,
                                             out List<string> writtenArtifacts,
                                             out string? errorMessage,
                                             out int exitCode) {
            writtenArtifacts = new List<string>();
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

            string fullWorkspacePath = Path.GetFullPath(request.WorkspaceRootPath);
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            StoryGraphCompilationResultModel compilation = compiler.Compile(sources, fullWorkspacePath);
            HostIntegrationPackageProjectIrArtifactModel projectIr = CreateProjectIrArtifact(compilation);
            WriteJsonArtifact(fullOutputPath, ProjectIrPath, projectIr, jsonOptions, manifest, writtenArtifacts);

            HostSchemaCapabilityCatalogModel hostSchemaCatalog = HostSchemaCapabilityCatalogDomain.Read(request.WorkspaceRootPath,
                                                                                                       config.HostSchema,
                                                                                                       jsonOptions);
            WriteJsonArtifact(fullOutputPath, HostSchemaCapabilitiesPath, hostSchemaCatalog, jsonOptions, manifest, writtenArtifacts);

            UsageManifestModel usage = UsageManifestDomain.Inspect(request.WorkspaceRootPath,
                                                                   request.ConfiguredConfigPath,
                                                                   sources,
                                                                   hostSchemaCatalog);
            WriteJsonArtifact(fullOutputPath, UsageManifestPath, usage, jsonOptions, manifest, writtenArtifacts);

            HostBindingCapabilityCatalogModel hostBindingCatalog = HostBindingCapabilityCatalogDomain.Read(request.WorkspaceRootPath,
                                                                                                           config.HostBridge,
                                                                                                           sources);
            HostIntegrationAuditModel audit = HostIntegrationAuditDomain.Audit(request.WorkspaceRootPath,
                                                                              request.ConfiguredConfigPath,
                                                                              usage,
                                                                              hostSchemaCatalog,
                                                                              hostBindingCatalog);
            WriteJsonArtifact(fullOutputPath, HostIntegrationAuditPath, audit, jsonOptions, manifest, writtenArtifacts);

            WriteTextArtifact(fullOutputPath,
                              LocalizationCsvPath,
                              LocalizationCsvFlowDomain.Extract(compilation.Graph),
                              manifest,
                              writtenArtifacts);
            return true;
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

        static HashSet<string> CreateWritableArtifactPathSet() {
            return new HashSet<string>(StringComparer.Ordinal) {
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ManifestFileName),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ProjectIrPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(UsageManifestPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(HostSchemaCapabilitiesPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(HostIntegrationAuditPath),
                HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(LocalizationCsvPath),
            };
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

    }

}
