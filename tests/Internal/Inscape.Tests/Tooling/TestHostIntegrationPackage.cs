using System.Text;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void HostIntegrationPackageManifestUsesPackageRelativePaths() {
            string workspacePath = Path.Combine(Path.GetTempPath(), "samples");
            HostIntegrationPackageManifestModel manifest = HostIntegrationPackageManifestDomain.Create(workspacePath,
                                                                                                      "2026-06-22T00:00:00Z");

            AssertEqual("inscape.integration-package", manifest.Format, "Package manifest format");
            AssertEqual(1, manifest.FormatVersion, "Package manifest format version");
            AssertEqual("samples", manifest.Workspace.Name, "Package manifest workspace name");
            AssertEqual("workspace-relative", manifest.Workspace.RootPolicy, "Package manifest root policy");
            AssertFalse(manifest.Capabilities.RuntimeIntegration, "Package manifest should not claim runtime integration.");
            AssertFalse(manifest.Capabilities.PreviewBridge, "Package manifest should not claim preview bridge support.");
            AssertFalse(manifest.Capabilities.WritesHostData, "Package manifest should not claim host writes.");
            AssertFalse(manifest.Capabilities.ContainsHostDependency, "Package manifest should not claim host dependencies.");

            AssertTrue(ContainsPackageArtifact(manifest, "manifest", "manifest.json", true, "ready"), "Package manifest should index itself as ready.");
            AssertTrue(ContainsPackageArtifact(manifest, "narrative-graph-ir", "graph/project-ir.json", true, "missing"), "Package manifest should index graph IR.");
            AssertTrue(ContainsPackageArtifact(manifest, "usage-manifest", "usage/usage.json", true, "missing"), "Package manifest should index usage manifest.");
            AssertTrue(ContainsPackageArtifact(manifest, "host-integration-audit", "host/host-integration-audit.json", true, "missing"), "Package manifest should index host integration audit.");
            AssertTrue(ContainsPackageArtifact(manifest, "source-locations", "source-map/source-locations.json", true, "missing"), "Package manifest should index source locations.");
            AssertTrue(ContainsPackageArtifact(manifest, "readiness-report", "reports/readiness-report.json", false, "missing"), "Package manifest should index optional readiness report.");

            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                string artifactPath = manifest.Artifacts[i].Path;
                AssertFalse(Path.IsPathRooted(artifactPath), "Package artifact paths must be package-relative.");
                AssertFalse(artifactPath.Contains("\\"), "Package artifact paths must use forward slashes.");
                AssertFalse(artifactPath.Contains(".."), "Package artifact paths must not traverse.");
                AssertEqual(artifactPath, HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(artifactPath), "Package artifact path should be normalized.");
            }
        }

        static void HostIntegrationPackagePathGuardRejectsUnsafePaths() {
            AssertTrue(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("graph\\project-ir.json",
                                                                                out string normalizedPath,
                                                                                out string? normalizeError),
                       "Package path guard should normalize platform separators.");
            AssertEqual("graph/project-ir.json", normalizedPath, "Package path normalized separator");
            AssertEqual(null, normalizeError, "Package path normalize error");

            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath(Path.Combine(Path.GetTempPath(), "artifact.json"),
                                                                                 out _,
                                                                                 out _),
                        "Package path guard should reject absolute paths.");
            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("C:\\artifact.json", out _, out _),
                        "Package path guard should reject Windows drive absolute paths.");
            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("../artifact.json", out _, out _),
                        "Package path guard should reject parent traversal.");
            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("graph/../artifact.json", out _, out _),
                        "Package path guard should reject nested parent traversal.");
            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("graph//artifact.json", out _, out _),
                        "Package path guard should reject empty path segments.");
            AssertFalse(HostIntegrationPackagePathDomain.TryNormalizeArtifactPath("https://example.test/artifact.json", out _, out _),
                        "Package path guard should reject URI paths.");
        }

        static void HostIntegrationPackageReadinessReportReadsReadyPackage() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-package-reader-ready-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

                bool created = HostIntegrationPackageReadinessReportDomain.TryCreateFromPackage(packageDirectory,
                                                                                                jsonOptions,
                                                                                                out HostIntegrationPackageReadinessReportModel report,
                                                                                                out string? errorMessage,
                                                                                                out int exitCode);

                AssertTrue(created, errorMessage ?? "Readiness report should be created from ready package.");
                AssertEqual(0, exitCode, "Ready package report exit code");
                AssertEqual("ready", report.Summary.Result, "Ready package report result");
                AssertEqual(10, report.Summary.ArtifactCount, "Ready package artifact count");
                AssertEqual(10, report.Summary.ReadyCount, "Ready package ready count");
                AssertTrue(ContainsReadinessArtifact(report, "graph/project-ir.json", "ready"), "Ready package should mark graph ready.");
                AssertFalse(report.Boundary.WritesHostData, "Ready package report must keep writesHostData false.");
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostIntegrationPackageReadinessReportDetectsMissingRequiredArtifact() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-package-reader-missing-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                File.Delete(Path.Combine(packageDirectory, "graph", "project-ir.json"));
                JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

                bool created = HostIntegrationPackageReadinessReportDomain.TryCreateFromPackage(packageDirectory,
                                                                                                jsonOptions,
                                                                                                out HostIntegrationPackageReadinessReportModel report,
                                                                                                out string? errorMessage,
                                                                                                out int exitCode);

                AssertTrue(created, errorMessage ?? "Readiness report should be created from package with missing artifact.");
                AssertEqual(0, exitCode, "Missing artifact package report exit code");
                AssertEqual("missing", report.Summary.Result, "Missing required artifact report result");
                AssertEqual(1, report.Summary.MissingCount, "Missing required artifact count");
                AssertTrue(ContainsReadinessArtifact(report, "graph/project-ir.json", "missing"), "Missing package should mark graph missing.");
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostIntegrationPackageReadinessReportDetectsInvalidJsonArtifact() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-package-reader-invalid-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                File.WriteAllText(Path.Combine(packageDirectory, "graph", "project-ir.json"), "{ invalid json", Encoding.UTF8);
                JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

                bool created = HostIntegrationPackageReadinessReportDomain.TryCreateFromPackage(packageDirectory,
                                                                                                jsonOptions,
                                                                                                out HostIntegrationPackageReadinessReportModel report,
                                                                                                out string? errorMessage,
                                                                                                out int exitCode);

                AssertTrue(created, errorMessage ?? "Readiness report should be created from package with invalid artifact.");
                AssertEqual(0, exitCode, "Invalid artifact package report exit code");
                AssertEqual("invalid", report.Summary.Result, "Invalid artifact report result");
                AssertEqual(1, report.Summary.InvalidCount, "Invalid artifact count");
                AssertTrue(ContainsReadinessArtifact(report, "graph/project-ir.json", "invalid"), "Invalid package should mark graph invalid.");
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static bool ContainsPackageArtifact(HostIntegrationPackageManifestModel manifest,
                                            string kind,
                                            string path,
                                            bool required,
                                            string status) {
            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactModel artifact = manifest.Artifacts[i];
                if (artifact.Kind == kind
                    && artifact.Path == path
                    && artifact.Required == required
                    && artifact.Status == status) {
                    return true;
                }
            }

            return false;
        }

        static bool ContainsReadinessArtifact(HostIntegrationPackageReadinessReportModel report,
                                              string path,
                                              string status) {
            for (int i = 0; i < report.ArtifactChecks.Count; i += 1) {
                HostIntegrationPackageReadinessArtifactCheckModel artifact = report.ArtifactChecks[i];
                if (artifact.Path == path && artifact.Status == status) {
                    return true;
                }
            }

            return false;
        }

        static void CreateMinimalReadyPackage(string packageDirectory) {
            Directory.CreateDirectory(packageDirectory);
            HostIntegrationPackageManifestModel manifest = HostIntegrationPackageManifestDomain.Create(packageDirectory,
                                                                                                      "2026-06-22T00:00:00Z");
            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                HostIntegrationPackageManifestDomain.TrySetArtifactStatus(manifest,
                                                                          manifest.Artifacts[i].Path,
                                                                          "ready");
            }

            WriteJson(packageDirectory, "graph/project-ir.json", """{"format":"inscape.project-ir","formatVersion":1,"diagnostics":[]}""");
            WriteJson(packageDirectory, "usage/usage.json", """{"format":"inscape.usage","formatVersion":1,"diagnostics":[]}""");
            WriteJson(packageDirectory, "host/host-schema-capabilities.json", """{"format":"inscape.host-schema.capabilities","formatVersion":1}""");
            WriteJson(packageDirectory, "host/host-integration-audit.json", """{"format":"inscape.host-integration.audit","formatVersion":1,"diagnostics":[]}""");
            WriteText(packageDirectory, "localization/l10n.csv", "anchor,nodeName,kind,speaker,text,translation,status,sourcePath,line,column" + Environment.NewLine);
            WriteText(packageDirectory, "source/story.inscape", "# start" + Environment.NewLine + "Narrator: Hello." + Environment.NewLine);
            WriteJson(packageDirectory, "source-map/source-locations.json", """{"format":"inscape.source-locations","formatVersion":1,"coordinateSystem":"compiler-1-based","sources":[],"locations":[]}""");
            WriteJson(packageDirectory, "localization/anchor-map.json", """{"format":"inscape.localization-anchor-map","formatVersion":1,"csv":"localization/l10n.csv","entries":[]}""");
            WriteJson(packageDirectory, "reports/readiness-report.json", """{"format":"inscape.host-integration.readiness-report","formatVersion":1,"artifactChecks":[]}""");
            WriteText(packageDirectory,
                      "manifest.json",
                      JsonSerializer.Serialize(manifest, new JsonSerializerOptions(JsonSerializerDefaults.Web)) + Environment.NewLine);
        }

        static void WriteJson(string packageDirectory, string packagePath, string json) {
            WriteText(packageDirectory, packagePath, json + Environment.NewLine);
        }

        static void WriteText(string packageDirectory, string packagePath, string text) {
            string path = Path.Combine(packageDirectory, packagePath.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(path) ?? packageDirectory);
            File.WriteAllText(path, text, new UTF8Encoding(false));
        }

    }

}
