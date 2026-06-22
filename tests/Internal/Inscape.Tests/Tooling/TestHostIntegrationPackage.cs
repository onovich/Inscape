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

    }

}
