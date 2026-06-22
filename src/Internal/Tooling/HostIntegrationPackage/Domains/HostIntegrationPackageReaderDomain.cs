using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageReaderDomain {

        const string ManifestFileName = "manifest.json";

        public static bool TryReadPackage(string packageDirectoryPath,
                                          JsonSerializerOptions jsonOptions,
                                          out HostIntegrationPackageReadResultModel package,
                                          out string? errorMessage,
                                          out int exitCode) {
            package = new HostIntegrationPackageReadResultModel();
            errorMessage = null;
            exitCode = 0;

            if (string.IsNullOrWhiteSpace(packageDirectoryPath) || !Directory.Exists(packageDirectoryPath)) {
                errorMessage = "Host Integration Package directory not found: " + packageDirectoryPath;
                exitCode = 3;
                return false;
            }

            string fullPackagePath = Path.GetFullPath(packageDirectoryPath);
            string manifestPath = Path.Combine(fullPackagePath, ManifestFileName);
            if (!File.Exists(manifestPath)) {
                errorMessage = "Host Integration Package manifest not found: " + manifestPath;
                exitCode = 3;
                return false;
            }

            HostIntegrationPackageManifestModel? manifest;
            try {
                manifest = JsonSerializer.Deserialize<HostIntegrationPackageManifestModel>(File.ReadAllText(manifestPath, Encoding.UTF8),
                                                                                           jsonOptions);
            } catch (JsonException ex) {
                errorMessage = "Host Integration Package manifest is not valid JSON: " + ex.Message;
                exitCode = 3;
                return false;
            }

            if (manifest == null) {
                errorMessage = "Host Integration Package manifest is empty: " + manifestPath;
                exitCode = 3;
                return false;
            }

            if (manifest.Format != HostIntegrationPackageManifestDomain.ManifestFormat) {
                errorMessage = "Unsupported Host Integration Package manifest format: " + manifest.Format;
                exitCode = 3;
                return false;
            }

            if (manifest.FormatVersion > HostIntegrationPackageManifestDomain.ManifestFormatVersion) {
                errorMessage = "Unsupported Host Integration Package manifest formatVersion: " + manifest.FormatVersion.ToString(System.Globalization.CultureInfo.InvariantCulture);
                exitCode = 3;
                return false;
            }

            package = new HostIntegrationPackageReadResultModel {
                PackageDirectoryPath = fullPackagePath,
                Manifest = manifest,
            };

            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactModel artifact = manifest.Artifacts[i];
                package.Artifacts.Add(ReadArtifact(fullPackagePath, artifact));
            }

            return true;
        }

        static HostIntegrationPackageArtifactReadModel ReadArtifact(string fullPackagePath,
                                                                    HostIntegrationPackageArtifactModel artifact) {
            HostIntegrationPackageArtifactReadModel result = new HostIntegrationPackageArtifactReadModel {
                Artifact = artifact,
                Status = artifact.Status,
            };

            if (!HostIntegrationPackagePathDomain.TryNormalizeArtifactPath(artifact.Path,
                                                                           out string normalizedPath,
                                                                           out string? normalizeError)) {
                result.Status = "invalid";
                result.Message = normalizeError;
                return result;
            }

            string artifactPath = ResolvePackagePath(fullPackagePath, normalizedPath);
            if (artifact.Kind == "source-files") {
                if (!Directory.Exists(artifactPath)) {
                    result.Status = "missing";
                    result.Message = "Package source directory is missing: " + normalizedPath;
                    return result;
                }

                result.Status = "ready";
                return result;
            }

            if (!File.Exists(artifactPath)) {
                result.Status = "missing";
                result.Message = "Package artifact is missing: " + normalizedPath;
                return result;
            }

            if (IsJsonArtifact(artifact)) {
                return ReadJsonArtifact(artifactPath, artifact, result);
            }

            result.Status = "ready";
            return result;
        }

        static HostIntegrationPackageArtifactReadModel ReadJsonArtifact(string artifactPath,
                                                                        HostIntegrationPackageArtifactModel artifact,
                                                                        HostIntegrationPackageArtifactReadModel result) {
            JsonDocument document;
            try {
                document = JsonDocument.Parse(File.ReadAllText(artifactPath, Encoding.UTF8));
            } catch (JsonException ex) {
                result.Status = "invalid";
                result.Message = "Package artifact is not valid JSON: " + artifact.Path + " (" + ex.Message + ")";
                return result;
            }

            using (document) {
                JsonElement root = document.RootElement;
                if (!string.IsNullOrWhiteSpace(artifact.Format)) {
                    if (!root.TryGetProperty("format", out JsonElement formatElement)
                        || formatElement.ValueKind != JsonValueKind.String) {
                        result.Status = "invalid";
                        result.Message = "Package artifact is missing string format: " + artifact.Path;
                        return result;
                    }

                    string? actualFormat = formatElement.GetString();
                    if (actualFormat != artifact.Format) {
                        result.Status = "invalid";
                        result.Message = "Package artifact format mismatch: " + artifact.Path;
                        return result;
                    }
                }

                if (artifact.FormatVersion.HasValue) {
                    if (!root.TryGetProperty("formatVersion", out JsonElement versionElement)
                        || versionElement.ValueKind != JsonValueKind.Number
                        || !versionElement.TryGetInt32(out int actualVersion)) {
                        result.Status = "invalid";
                        result.Message = "Package artifact is missing numeric formatVersion: " + artifact.Path;
                        return result;
                    }

                    if (actualVersion > artifact.FormatVersion.Value) {
                        result.Status = "incompatible";
                        result.Message = "Package artifact formatVersion is not supported: " + artifact.Path;
                        return result;
                    }

                    if (actualVersion != artifact.FormatVersion.Value) {
                        result.Status = "invalid";
                        result.Message = "Package artifact formatVersion mismatch: " + artifact.Path;
                        return result;
                    }
                }
            }

            result.Status = "ready";
            return result;
        }

        static bool IsJsonArtifact(HostIntegrationPackageArtifactModel artifact) {
            if (!string.IsNullOrWhiteSpace(artifact.Format)
                && artifact.Format != "text/csv"
                && artifact.Format != "inscape.source-files") {
                return true;
            }

            return artifact.Path.EndsWith(".json", StringComparison.OrdinalIgnoreCase);
        }

        static string ResolvePackagePath(string fullPackagePath, string normalizedPath) {
            string candidate = Path.GetFullPath(Path.Combine(fullPackagePath,
                                                             normalizedPath.Replace('/', Path.DirectorySeparatorChar)));
            string rootPrefix = fullPackagePath.EndsWith(Path.DirectorySeparatorChar)
                ? fullPackagePath
                : fullPackagePath + Path.DirectorySeparatorChar;
            if (!candidate.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
                && !string.Equals(candidate, fullPackagePath, StringComparison.OrdinalIgnoreCase)) {
                throw new InvalidOperationException("Package artifact path escaped package directory: " + normalizedPath);
            }

            return candidate;
        }

    }

}
