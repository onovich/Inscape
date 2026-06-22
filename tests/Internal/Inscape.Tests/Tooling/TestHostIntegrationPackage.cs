using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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

        static void HostIntegrationPackageReadinessReportAggregatesDiagnostics() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-package-reader-diagnostics-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteJson(packageDirectory,
                          "source-map/source-locations.json",
                          """{"format":"inscape.source-locations","formatVersion":1,"coordinateSystem":"compiler-1-based","sources":[{"id":"src_001","path":"source/story.inscape","workspacePath":"story.inscape","availability":"packaged"}],"locations":[]}""");
                WriteJson(packageDirectory,
                          "graph/project-ir.json",
                          """{"format":"inscape.project-ir","formatVersion":1,"diagnostics":[{"code":"INS020","severity":"Error","message":"Missing target.","sourcePath":"story.inscape","line":4,"column":3}]}""");
                WriteJson(packageDirectory,
                          "host/host-integration-audit.json",
                          """{"format":"inscape.host-integration.audit","formatVersion":1,"diagnostics":[{"severity":"error","code":"HIA002","category":"action","message":"Unknown action play_cutscene.","subjectKind":"action","subjectName":"play_cutscene","source":{"path":"story.inscape","line":2,"column":1,"length":27}}]}""");
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostIntegrationPackageReadinessReportDomain.TryCreateFromPackage(packageDirectory,
                                                                                                jsonOptions,
                                                                                                out HostIntegrationPackageReadinessReportModel report,
                                                                                                out string? errorMessage,
                                                                                                out int exitCode);

                AssertTrue(created, errorMessage ?? "Readiness report should aggregate package diagnostics.");
                AssertEqual(0, exitCode, "Diagnostic package report exit code");
                AssertEqual("blocked", report.Summary.Result, "Diagnostic package report result");
                AssertEqual(2, report.Summary.DiagnosticCount, "Diagnostic package diagnostic count");
                AssertEqual(2, report.Summary.ErrorCount, "Diagnostic package error count");
                AssertTrue(ContainsReadinessDiagnostic(report, "INS020", "source/story.inscape"), "Report should include compiler diagnostic source.");
                AssertTrue(ContainsReadinessDiagnostic(report, "HIA002", "source/story.inscape"), "Report should include host integration diagnostic source.");
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostIntegrationPackageReadinessReportSummarizesExistingCandidate() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-package-reader-candidate-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteJson(packageDirectory,
                          "host/host-bridge-candidate.json",
                          """{"format":"inscape.host-bridge-candidate","formatVersion":1,"summary":{"result":"blocked","candidateCount":2,"blockedCount":1,"writesHostData":false},"candidates":[]}""");
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostIntegrationPackageReadinessReportDomain.TryCreateFromPackage(packageDirectory,
                                                                                                jsonOptions,
                                                                                                out HostIntegrationPackageReadinessReportModel report,
                                                                                                out string? errorMessage,
                                                                                                out int exitCode);

                AssertTrue(created, errorMessage ?? "Readiness report should summarize existing Host Bridge candidate evidence.");
                AssertEqual(0, exitCode, "Existing candidate package report exit code");
                AssertEqual("blocked", report.Summary.Result, "Existing blocked candidate should drive readiness result");
                AssertEqual("host/host-bridge-candidate.json", report.HostBridgeCandidate.Path, "Existing candidate report path");
                AssertEqual("blocked", report.HostBridgeCandidate.Status, "Existing candidate status");
                AssertEqual(2, report.HostBridgeCandidate.CandidateCount, "Existing candidate count");
                AssertFalse(report.HostBridgeCandidate.WritesHostData, "Existing candidate summary must not write host data.");
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationReportsEmptyPackage() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-empty-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should be created from ready package.");
                AssertEqual(0, exitCode, "Empty Host Bridge candidate exit code");
                AssertEqual("empty", candidate.Summary.Result, "Empty Host Bridge candidate result");
                AssertEqual(0, candidate.Summary.CandidateCount, "Empty Host Bridge candidate count");
                AssertFalse(candidate.Summary.WritesHostData, "Candidate artifact must not write host data.");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationReportsReadyCandidates() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-ready-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteJson(packageDirectory,
                          "usage/usage.json",
                          """{"format":"inscape.usage","formatVersion":1,"requiredIds":[{"kind":"timeline","name":"intro_cutscene","usedBy":{"capabilityKind":"action","name":"play_cutscene","argumentIndex":0},"reason":"action argument references host timeline","source":{"path":"source/story.inscape","line":2,"column":14,"length":14}}]}""");
                WriteJson(packageDirectory,
                          "host/host-schema-capabilities.json",
                          """{"format":"inscape.host-schema.capabilities","formatVersion":1,"queries":[{"name":"player.name"}],"actions":[{"name":"play_cutscene"}]}""");
                WriteJson(packageDirectory,
                          "host/host-integration-audit.json",
                          """{"format":"inscape.host-integration.audit","formatVersion":1,"diagnostics":[{"severity":"error","code":"HIA004","category":"host-bridge","message":"Missing Host Bridge id binding for timeline intro_cutscene.","subjectKind":"timeline","subjectName":"intro_cutscene","source":{"path":"source/story.inscape","line":2,"column":14,"length":14}},{"severity":"error","code":"HIA007","category":"host-bridge","message":"Missing Host Bridge action handler for play_cutscene.","subjectKind":"action","subjectName":"play_cutscene","source":{"path":"source/story.inscape","line":2,"column":1,"length":28}},{"severity":"error","code":"HIA008","category":"host-bridge","message":"Missing Host Bridge query handler for player.name.","subjectKind":"query","subjectName":"player.name","source":{"path":"source/story.inscape","line":3,"column":8,"length":13}}]}""");
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should be created from package gaps.");
                AssertEqual(0, exitCode, "Ready Host Bridge candidate exit code");
                AssertEqual("ready", candidate.Summary.Result, "Ready Host Bridge candidate result");
                AssertEqual(3, candidate.Summary.CandidateCount, "Ready Host Bridge candidate count");
                AssertEqual(0, candidate.Summary.BlockedCount, "Ready Host Bridge candidate blocked count");
                AssertTrue(ContainsCandidate(candidate, "id-binding", "timeline", "intro_cutscene", "candidate"), "Candidate should include timeline id binding.");
                AssertTrue(ContainsCandidate(candidate, "action-handler", "action", "play_cutscene", "candidate"), "Candidate should include action handler only for declared Host Schema action.");
                AssertTrue(ContainsCandidate(candidate, "query-handler", "query", "player.name", "candidate"), "Candidate should include query handler only for declared Host Schema query.");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationBlocksUnknownSchemaCapabilities() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-blocked-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteJson(packageDirectory,
                          "host/host-integration-audit.json",
                          """{"format":"inscape.host-integration.audit","formatVersion":1,"diagnostics":[{"severity":"error","code":"HIA001","category":"host-schema","message":"Unknown query player.rank.","subjectKind":"query","subjectName":"player.rank","source":{"path":"source/story.inscape","line":4,"column":8,"length":13}},{"severity":"error","code":"HIA002","category":"host-schema","message":"Unknown action award_badge.","subjectKind":"action","subjectName":"award_badge","source":{"path":"source/story.inscape","line":5,"column":1,"length":18}}]}""");
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should be created from schema gaps.");
                AssertEqual(0, exitCode, "Blocked Host Bridge candidate exit code");
                AssertEqual("blocked", candidate.Summary.Result, "Blocked Host Bridge candidate result");
                AssertEqual(2, candidate.Summary.CandidateCount, "Blocked Host Bridge candidate count");
                AssertEqual(2, candidate.Summary.BlockedCount, "Blocked Host Bridge candidate blocked count");
                AssertTrue(ContainsCandidate(candidate, "schema-capability", "query", "player.rank", "blocked"), "Unknown query should become schema capability evidence.");
                AssertTrue(ContainsCandidate(candidate, "schema-capability", "action", "award_badge", "blocked"), "Unknown action should become schema capability evidence.");
                AssertFalse(ContainsCandidate(candidate, "action-handler", "action", "award_badge", "candidate"), "Unknown action must not become a fake action-handler candidate.");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationIgnoresInvalidOptionalReadinessReport() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-optional-report-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteText(packageDirectory, "reports/readiness-report.json", "{ invalid json" + Environment.NewLine);
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should ignore unrelated optional readiness report JSON.");
                AssertEqual(0, exitCode, "Optional readiness report compatibility candidate exit code");
                AssertEqual("empty", candidate.Summary.Result, "Optional readiness report should not block candidate generation");
                AssertEqual(0, candidate.Summary.CandidateCount, "Optional readiness report should not create candidates");
                AssertEqual(0, candidate.Diagnostics.Count, "Optional readiness report should not create candidate diagnostics");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationReportsInvalidArtifact() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-invalid-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteText(packageDirectory, "usage/usage.json", "{ invalid json" + Environment.NewLine);
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should report invalid package artifact.");
                AssertEqual(0, exitCode, "Invalid Host Bridge candidate exit code");
                AssertEqual("invalid", candidate.Summary.Result, "Invalid Host Bridge candidate result");
                AssertTrue(ContainsCandidateDiagnostic(candidate, "HBC003"), "Invalid candidate should include artifact diagnostic.");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static void HostBridgeCandidateGenerationReportsIncompatibleArtifact() {
            string packageDirectory = Path.Combine(Path.GetTempPath(), "inscape-bridge-candidate-incompatible-" + Guid.NewGuid().ToString("N"));
            try {
                CreateMinimalReadyPackage(packageDirectory);
                WriteJson(packageDirectory,
                          "usage/usage.json",
                          """{"format":"inscape.usage","formatVersion":2}""");
                JsonSerializerOptions jsonOptions = CreatePackageJsonOptions();

                bool created = HostBridgeCandidateGenerationDomain.TryCreateFromPackage(packageDirectory,
                                                                                        jsonOptions,
                                                                                        out HostBridgeCandidateModel candidate,
                                                                                        out string? errorMessage,
                                                                                        out int exitCode);

                AssertTrue(created, errorMessage ?? "Host Bridge candidate should report incompatible package artifact.");
                AssertEqual(0, exitCode, "Incompatible Host Bridge candidate exit code");
                AssertEqual("incompatible", candidate.Summary.Result, "Incompatible Host Bridge candidate result");
                AssertTrue(ContainsCandidateDiagnostic(candidate, "HBC002"), "Incompatible candidate should include artifact diagnostic.");
                AssertCandidateOnlyOwnership(candidate);
            } finally {
                if (Directory.Exists(packageDirectory)) {
                    Directory.Delete(packageDirectory, true);
                }
            }
        }

        static JsonSerializerOptions CreatePackageJsonOptions() {
            JsonSerializerOptions jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            jsonOptions.Converters.Add(new JsonStringEnumConverter());
            return jsonOptions;
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

        static bool ContainsReadinessDiagnostic(HostIntegrationPackageReadinessReportModel report,
                                                string code,
                                                string sourcePath) {
            for (int i = 0; i < report.Diagnostics.Count; i += 1) {
                HostIntegrationPackageReadinessDiagnosticModel diagnostic = report.Diagnostics[i];
                if (diagnostic.Code == code && diagnostic.Source.Path == sourcePath) {
                    return true;
                }
            }

            return false;
        }

        static bool ContainsCandidate(HostBridgeCandidateModel candidate,
                                      string candidateKind,
                                      string subjectKind,
                                      string subjectName,
                                      string status) {
            for (int i = 0; i < candidate.Candidates.Count; i += 1) {
                HostBridgeCandidateItemModel item = candidate.Candidates[i];
                if (item.CandidateKind == candidateKind
                    && item.Subject.Kind == subjectKind
                    && item.Subject.Name == subjectName
                    && item.Status == status) {
                    return true;
                }
            }

            return false;
        }

        static bool ContainsCandidateDiagnostic(HostBridgeCandidateModel candidate,
                                                string code) {
            for (int i = 0; i < candidate.Diagnostics.Count; i += 1) {
                if (candidate.Diagnostics[i].Code == code) {
                    return true;
                }
            }

            return false;
        }

        static void AssertCandidateOnlyOwnership(HostBridgeCandidateModel candidate) {
            AssertFalse(candidate.Summary.WritesHostData, "Candidate summary must keep writesHostData false.");
            for (int i = 0; i < candidate.Candidates.Count; i += 1) {
                HostBridgeCandidateItemModel item = candidate.Candidates[i];
                AssertEqual("candidate-only", item.Ownership.GeneratedOwnership, "Candidate ownership must stay review-only.");
                AssertFalse(item.Ownership.WritesHostData, "Candidate item must not write host data.");
                AssertTrue(item.Review.Required, "Candidate item must require review.");
            }
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
