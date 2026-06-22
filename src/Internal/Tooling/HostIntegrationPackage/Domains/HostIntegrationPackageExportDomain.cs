using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageExportDomain {

        const string ManifestFileName = "manifest.json";

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

            if (!EnsureWritablePackageDirectory(fullOutputPath, out errorMessage)) {
                exitCode = 2;
                return false;
            }

            string manifestPath = Path.Combine(fullOutputPath, ManifestFileName);
            string createdAtUtc = ResolveCreatedAtUtc(manifestPath, jsonOptions);
            HostIntegrationPackageManifestModel manifest = HostIntegrationPackageManifestDomain.Create(request.WorkspaceRootPath,
                                                                                                      createdAtUtc);
            string json = JsonSerializer.Serialize(manifest, jsonOptions);
            File.WriteAllText(manifestPath, json + Environment.NewLine, new UTF8Encoding(false));

            result = new HostIntegrationPackageExportResultModel {
                OutputDirectoryPath = fullOutputPath,
                ManifestPath = manifestPath,
                Manifest = manifest,
                WrittenArtifacts = new List<string> {
                    HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(ManifestFileName),
                },
            };
            return true;
        }

        static bool EnsureWritablePackageDirectory(string fullOutputPath, out string? errorMessage) {
            errorMessage = null;
            if (!Directory.Exists(fullOutputPath)) {
                Directory.CreateDirectory(fullOutputPath);
                return true;
            }

            foreach (string entry in Directory.EnumerateFileSystemEntries(fullOutputPath)) {
                if (File.Exists(entry) && Path.GetFileName(entry) == ManifestFileName) {
                    continue;
                }

                errorMessage = "Host Integration Package output directory contains non-package files: " + fullOutputPath;
                return false;
            }

            return true;
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
