using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageReadinessReportDomain {

        const string ManifestFileName = "manifest.json";

        public static HostIntegrationPackageReadinessReportModel CreateFromManifest(HostIntegrationPackageManifestModel manifest,
                                                                                   string createdAtUtc) {
            HostIntegrationPackageReadinessReportModel report = CreateBaseReport(manifest, createdAtUtc);
            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactModel artifact = manifest.Artifacts[i];
                report.ArtifactChecks.Add(CreateArtifactCheck(artifact, artifact.Status));
            }

            FinalizeSummary(report);
            return report;
        }

        public static bool TryCreateFromPackage(string packageDirectoryPath,
                                                JsonSerializerOptions jsonOptions,
                                                out HostIntegrationPackageReadinessReportModel report,
                                                out string? errorMessage,
                                                out int exitCode) {
            report = new HostIntegrationPackageReadinessReportModel();
            if (!HostIntegrationPackageReaderDomain.TryReadPackage(packageDirectoryPath,
                                                                   jsonOptions,
                                                                   out HostIntegrationPackageReadResultModel package,
                                                                   out errorMessage,
                                                                   out exitCode)) {
                return false;
            }

            report = CreateFromPackage(package);
            return true;
        }

        public static HostIntegrationPackageReadinessReportModel CreateFromPackage(HostIntegrationPackageReadResultModel package) {
            string createdAtUtc = string.IsNullOrWhiteSpace(package.Manifest.CreatedAtUtc)
                ? string.Empty
                : package.Manifest.CreatedAtUtc;
            HostIntegrationPackageReadinessReportModel report = CreateBaseReport(package.Manifest, createdAtUtc);
            for (int i = 0; i < package.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactReadModel read = package.Artifacts[i];
                report.ArtifactChecks.Add(CreateArtifactCheck(read.Artifact, read.Status));
            }

            FinalizeSummary(report);
            return report;
        }

        static HostIntegrationPackageReadinessReportModel CreateBaseReport(HostIntegrationPackageManifestModel manifest,
                                                                          string createdAtUtc) {
            return new HostIntegrationPackageReadinessReportModel {
                CreatedAtUtc = createdAtUtc,
                Profile = new HostIntegrationPackageReadinessProfileModel {
                    Kind = "partner-profile",
                    Partner = string.IsNullOrWhiteSpace(manifest.Profile.Partner) ? "generic" : manifest.Profile.Partner!,
                    Purpose = manifest.Profile.Purpose,
                },
                Package = new HostIntegrationPackageReadinessPackageModel {
                    Manifest = ManifestFileName,
                    FixtureSet = "host-integration-package-cli",
                },
                Boundary = new HostIntegrationPackageCapabilitiesModel {
                    RuntimeIntegration = manifest.Capabilities.RuntimeIntegration,
                    PreviewBridge = manifest.Capabilities.PreviewBridge,
                    WritesHostData = manifest.Capabilities.WritesHostData,
                    ContainsHostDependency = manifest.Capabilities.ContainsHostDependency,
                },
                HostBridgeCandidate = new HostIntegrationPackageReadinessHostBridgeCandidateModel {
                    Path = "host/host-bridge-candidate.json",
                    Status = "missing",
                    CandidateCount = 0,
                    WritesHostData = false,
                },
            };
        }

        static HostIntegrationPackageReadinessArtifactCheckModel CreateArtifactCheck(HostIntegrationPackageArtifactModel artifact,
                                                                                    string status) {
            return new HostIntegrationPackageReadinessArtifactCheckModel {
                Kind = artifact.Kind,
                Path = artifact.Path,
                Required = artifact.Required,
                Status = status,
                Format = artifact.Format,
                FormatVersion = artifact.FormatVersion,
            };
        }

        static void FinalizeSummary(HostIntegrationPackageReadinessReportModel report) {
            report.Summary.ArtifactCount = report.ArtifactChecks.Count;
            report.Summary.WritesHostData = false;

            for (int i = 0; i < report.ArtifactChecks.Count; i += 1) {
                HostIntegrationPackageReadinessArtifactCheckModel artifact = report.ArtifactChecks[i];
                if (artifact.Status == "ready") {
                    report.Summary.ReadyCount += 1;
                } else if (artifact.Status == "missing") {
                    report.Summary.MissingCount += 1;
                } else if (artifact.Status == "invalid") {
                    report.Summary.InvalidCount += 1;
                } else if (artifact.Status == "unsupported") {
                    report.Summary.UnsupportedCount += 1;
                } else if (artifact.Status == "blocked") {
                    report.Summary.BlockedCount += 1;
                } else if (artifact.Status == "incompatible") {
                    report.Summary.IncompatibleCount += 1;
                }
            }

            if (report.Summary.InvalidCount > 0) {
                report.Summary.Result = "invalid";
            } else if (report.Summary.IncompatibleCount > 0) {
                report.Summary.Result = "incompatible";
            } else if (HasMissingRequiredArtifact(report)) {
                report.Summary.Result = "missing";
            } else if (report.Summary.BlockedCount > 0) {
                report.Summary.Result = "blocked";
            } else if (report.Summary.UnsupportedCount > 0) {
                report.Summary.Result = "unsupported";
            } else {
                report.Summary.Result = "ready";
            }
        }

        static bool HasMissingRequiredArtifact(HostIntegrationPackageReadinessReportModel report) {
            for (int i = 0; i < report.ArtifactChecks.Count; i += 1) {
                HostIntegrationPackageReadinessArtifactCheckModel artifact = report.ArtifactChecks[i];
                if (artifact.Required && artifact.Status == "missing") {
                    return true;
                }
            }

            return false;
        }

    }

}
