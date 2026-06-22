using System.Text;
using System.Text.Json;
using Inscape.Compiler.Diagnostics;

namespace Inscape.Tooling {

    public static class HostIntegrationPackageReadinessReportDomain {

        const string ManifestFileName = "manifest.json";
        const string ProjectIrPath = "graph/project-ir.json";
        const string HostIntegrationAuditPath = "host/host-integration-audit.json";
        const string SourceLocationsPath = "source-map/source-locations.json";
        const string HostBridgeCandidatePath = "host/host-bridge-candidate.json";

        public static HostIntegrationPackageReadinessReportModel CreateFromManifest(HostIntegrationPackageManifestModel manifest,
                                                                                   string createdAtUtc) {
            return CreateFromManifest(manifest,
                                      createdAtUtc,
                                      new List<HostIntegrationPackageReadinessDiagnosticModel>());
        }

        public static HostIntegrationPackageReadinessReportModel CreateFromManifest(HostIntegrationPackageManifestModel manifest,
                                                                                   string createdAtUtc,
                                                                                   IReadOnlyList<HostIntegrationPackageReadinessDiagnosticModel> diagnostics) {
            HostIntegrationPackageReadinessReportModel report = CreateBaseReport(manifest, createdAtUtc);
            for (int i = 0; i < manifest.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactModel artifact = manifest.Artifacts[i];
                report.ArtifactChecks.Add(CreateArtifactCheck(artifact, artifact.Status));
            }

            AddDiagnostics(report, diagnostics);
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

            report = CreateFromPackage(package, jsonOptions);
            return true;
        }

        public static HostIntegrationPackageReadinessReportModel CreateFromPackage(HostIntegrationPackageReadResultModel package,
                                                                                  JsonSerializerOptions jsonOptions) {
            string createdAtUtc = string.IsNullOrWhiteSpace(package.Manifest.CreatedAtUtc)
                ? string.Empty
                : package.Manifest.CreatedAtUtc;
            HostIntegrationPackageReadinessReportModel report = CreateBaseReport(package.Manifest, createdAtUtc);
            for (int i = 0; i < package.Artifacts.Count; i += 1) {
                HostIntegrationPackageArtifactReadModel read = package.Artifacts[i];
                report.ArtifactChecks.Add(CreateArtifactCheck(read.Artifact, read.Status));
            }

            ApplyHostBridgeCandidateSummary(report, package, jsonOptions);
            AddDiagnostics(report, CreateDiagnostics(package, jsonOptions));
            FinalizeSummary(report);
            return report;
        }

        public static List<HostIntegrationPackageReadinessDiagnosticModel> CreateDiagnostics(IReadOnlyList<DiagnosticModel> compilerDiagnostics,
                                                                                            IReadOnlyList<HostIntegrationAuditDiagnosticModel> hostIntegrationDiagnostics,
                                                                                            Func<string, string> sourcePathMapper) {
            List<HostIntegrationPackageReadinessDiagnosticModel> diagnostics = new List<HostIntegrationPackageReadinessDiagnosticModel>();
            for (int i = 0; i < compilerDiagnostics.Count; i += 1) {
                DiagnosticModel diagnostic = compilerDiagnostics[i];
                diagnostics.Add(new HostIntegrationPackageReadinessDiagnosticModel {
                    Code = diagnostic.Code,
                    Severity = diagnostic.Severity.ToString().ToLowerInvariant(),
                    Message = diagnostic.Message,
                    Source = CreateSourceRef(sourcePathMapper(diagnostic.SourcePath),
                                             diagnostic.Line,
                                             diagnostic.Column),
                });
            }

            for (int i = 0; i < hostIntegrationDiagnostics.Count; i += 1) {
                HostIntegrationAuditDiagnosticModel diagnostic = hostIntegrationDiagnostics[i];
                diagnostics.Add(new HostIntegrationPackageReadinessDiagnosticModel {
                    Code = diagnostic.Code,
                    Severity = diagnostic.Severity,
                    Message = diagnostic.Message,
                    Source = CreateSourceRef(sourcePathMapper(diagnostic.Source.Path),
                                             diagnostic.Source.Line,
                                             diagnostic.Source.Column),
                });
            }

            return diagnostics;
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
                    Path = HostBridgeCandidatePath,
                    Status = "missing",
                    CandidateCount = 0,
                    WritesHostData = false,
                },
            };
        }

        static void ApplyHostBridgeCandidateSummary(HostIntegrationPackageReadinessReportModel report,
                                                    HostIntegrationPackageReadResultModel package,
                                                    JsonSerializerOptions jsonOptions) {
            string candidatePath = Path.Combine(package.PackageDirectoryPath,
                                                HostBridgeCandidatePath.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(candidatePath)) {
                return;
            }

            if (!TryReadHostBridgeCandidate(candidatePath,
                                            jsonOptions,
                                            out HostBridgeCandidateModel? candidate,
                                            out string status)) {
                report.HostBridgeCandidate.Status = status;
                report.HostBridgeCandidate.CandidateCount = 0;
                report.HostBridgeCandidate.WritesHostData = false;
                return;
            }

            if (candidate == null) {
                report.HostBridgeCandidate.Status = "invalid";
                report.HostBridgeCandidate.CandidateCount = 0;
                report.HostBridgeCandidate.WritesHostData = false;
                return;
            }

            report.HostBridgeCandidate.Status = NormalizeHostBridgeCandidateStatus(candidate.Summary.Result);
            report.HostBridgeCandidate.CandidateCount = candidate.Summary.CandidateCount;
            report.HostBridgeCandidate.WritesHostData = CandidateWritesHostData(candidate);
            if (report.HostBridgeCandidate.WritesHostData
                && (report.HostBridgeCandidate.Status == "ready" || report.HostBridgeCandidate.Status == "empty")) {
                report.HostBridgeCandidate.Status = "blocked";
            }
        }

        static bool TryReadHostBridgeCandidate(string candidatePath,
                                               JsonSerializerOptions jsonOptions,
                                               out HostBridgeCandidateModel? candidate,
                                               out string status) {
            candidate = null;
            status = "invalid";

            string json;
            try {
                json = File.ReadAllText(candidatePath, Encoding.UTF8);
            } catch (IOException) {
                return false;
            }

            try {
                using (JsonDocument document = JsonDocument.Parse(json)) {
                    JsonElement root = document.RootElement;
                    if (root.ValueKind != JsonValueKind.Object) {
                        status = "invalid";
                        return false;
                    }

                    if (!root.TryGetProperty("format", out JsonElement formatElement)
                        || formatElement.ValueKind != JsonValueKind.String
                        || formatElement.GetString() != "inscape.host-bridge-candidate") {
                        status = "invalid";
                        return false;
                    }

                    if (!root.TryGetProperty("formatVersion", out JsonElement versionElement)
                        || versionElement.ValueKind != JsonValueKind.Number
                        || !versionElement.TryGetInt32(out int formatVersion)) {
                        status = "invalid";
                        return false;
                    }

                    if (formatVersion > 1) {
                        status = "incompatible";
                        return false;
                    }

                    if (formatVersion != 1) {
                        status = "invalid";
                        return false;
                    }
                }

                candidate = JsonSerializer.Deserialize<HostBridgeCandidateModel>(json, jsonOptions);
                return candidate != null;
            } catch (JsonException) {
                status = "invalid";
                return false;
            }
        }

        static string NormalizeHostBridgeCandidateStatus(string status) {
            if (status == "ready"
                || status == "empty"
                || status == "invalid"
                || status == "blocked"
                || status == "incompatible"
                || status == "unsupported") {
                return status;
            }

            return "invalid";
        }

        static bool CandidateWritesHostData(HostBridgeCandidateModel candidate) {
            if (candidate.Summary.WritesHostData) {
                return true;
            }

            for (int i = 0; i < candidate.Candidates.Count; i += 1) {
                if (candidate.Candidates[i].Ownership.WritesHostData) {
                    return true;
                }
            }

            return false;
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

        static List<HostIntegrationPackageReadinessDiagnosticModel> CreateDiagnostics(HostIntegrationPackageReadResultModel package,
                                                                                    JsonSerializerOptions jsonOptions) {
            List<HostIntegrationPackageReadinessDiagnosticModel> diagnostics = new List<HostIntegrationPackageReadinessDiagnosticModel>();
            HostIntegrationPackageSourceLocationsModel? sourceLocations = null;
            HostIntegrationPackageReaderDomain.TryReadJsonArtifact(package.PackageDirectoryPath,
                                                                   SourceLocationsPath,
                                                                   jsonOptions,
                                                                   out sourceLocations,
                                                                   out _);

            if (HostIntegrationPackageReaderDomain.TryReadJsonArtifact(package.PackageDirectoryPath,
                                                                       ProjectIrPath,
                                                                       jsonOptions,
                                                                       out HostIntegrationPackageProjectIrArtifactModel? projectIr,
                                                                       out _)
                && projectIr != null) {
                for (int i = 0; i < projectIr.Diagnostics.Count; i += 1) {
                    DiagnosticModel diagnostic = projectIr.Diagnostics[i];
                    diagnostics.Add(new HostIntegrationPackageReadinessDiagnosticModel {
                        Code = diagnostic.Code,
                        Severity = diagnostic.Severity.ToString().ToLowerInvariant(),
                        Message = diagnostic.Message,
                        Source = CreateSourceRef(MapSourcePath(diagnostic.SourcePath, sourceLocations),
                                                 diagnostic.Line,
                                                 diagnostic.Column),
                    });
                }
            }

            if (HostIntegrationPackageReaderDomain.TryReadJsonArtifact(package.PackageDirectoryPath,
                                                                       HostIntegrationAuditPath,
                                                                       jsonOptions,
                                                                       out HostIntegrationAuditModel? audit,
                                                                       out _)
                && audit != null) {
                for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                    HostIntegrationAuditDiagnosticModel diagnostic = audit.Diagnostics[i];
                    diagnostics.Add(new HostIntegrationPackageReadinessDiagnosticModel {
                        Code = diagnostic.Code,
                        Severity = diagnostic.Severity,
                        Message = diagnostic.Message,
                        Source = CreateSourceRef(MapSourcePath(diagnostic.Source.Path, sourceLocations),
                                                 diagnostic.Source.Line,
                                                 diagnostic.Source.Column),
                    });
                }
            }

            return diagnostics;
        }

        static void AddDiagnostics(HostIntegrationPackageReadinessReportModel report,
                                   IReadOnlyList<HostIntegrationPackageReadinessDiagnosticModel> diagnostics) {
            for (int i = 0; i < diagnostics.Count; i += 1) {
                report.Diagnostics.Add(diagnostics[i]);
            }
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

            for (int i = 0; i < report.Diagnostics.Count; i += 1) {
                HostIntegrationPackageReadinessDiagnosticModel diagnostic = report.Diagnostics[i];
                report.Summary.DiagnosticCount += 1;
                if (diagnostic.Severity == "error") {
                    report.Summary.ErrorCount += 1;
                } else if (diagnostic.Severity == "warning") {
                    report.Summary.WarningCount += 1;
                } else if (diagnostic.Severity == "info") {
                    report.Summary.InfoCount += 1;
                }
            }

            if (report.Summary.InvalidCount > 0 || report.HostBridgeCandidate.Status == "invalid") {
                report.Summary.Result = "invalid";
            } else if (report.Summary.IncompatibleCount > 0 || report.HostBridgeCandidate.Status == "incompatible") {
                report.Summary.Result = "incompatible";
            } else if (HasMissingRequiredArtifact(report)) {
                report.Summary.Result = "missing";
            } else if (report.Summary.ErrorCount > 0) {
                report.Summary.BlockedCount += report.Summary.ErrorCount;
                report.Summary.Result = "blocked";
            } else if (report.Summary.BlockedCount > 0
                       || report.HostBridgeCandidate.Status == "blocked"
                       || report.HostBridgeCandidate.WritesHostData) {
                report.Summary.Result = "blocked";
            } else if (report.Summary.UnsupportedCount > 0 || report.HostBridgeCandidate.Status == "unsupported") {
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

        static HostIntegrationPackageSourceRefModel CreateSourceRef(string path,
                                                                    int line,
                                                                    int column) {
            return new HostIntegrationPackageSourceRefModel {
                Path = path,
                Line = line,
                Column = column,
                CoordinateSystem = "compiler-1-based",
            };
        }

        static string MapSourcePath(string sourcePath, HostIntegrationPackageSourceLocationsModel? sourceLocations) {
            string normalized = NormalizePathText(sourcePath);
            if (string.IsNullOrWhiteSpace(normalized)) {
                return string.Empty;
            }

            if (normalized.StartsWith("source/", StringComparison.Ordinal)) {
                return HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(normalized);
            }

            if (sourceLocations != null) {
                for (int i = 0; i < sourceLocations.Sources.Count; i += 1) {
                    HostIntegrationPackageSourceLocationSourceModel source = sourceLocations.Sources[i];
                    string workspacePath = NormalizePathText(source.WorkspacePath);
                    if (!string.IsNullOrWhiteSpace(workspacePath)
                        && (string.Equals(normalized, workspacePath, StringComparison.OrdinalIgnoreCase)
                            || normalized.EndsWith("/" + workspacePath, StringComparison.OrdinalIgnoreCase))) {
                        return HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(source.Path);
                    }

                    string packagePath = NormalizePathText(source.Path);
                    if (!string.IsNullOrWhiteSpace(packagePath)
                        && (string.Equals(normalized, packagePath, StringComparison.Ordinal)
                            || normalized.EndsWith("/" + packagePath, StringComparison.OrdinalIgnoreCase))) {
                        return HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(source.Path);
                    }
                }
            }

            string fileName = ExtractFileName(normalized);
            return string.IsNullOrWhiteSpace(fileName)
                ? normalized
                : HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath("source/" + fileName);
        }

        static string NormalizePathText(string path) {
            return string.IsNullOrWhiteSpace(path)
                ? string.Empty
                : path.Replace('\\', '/').Trim();
        }

        static string ExtractFileName(string normalizedPath) {
            int index = normalizedPath.LastIndexOf('/');
            return index >= 0 && index + 1 < normalizedPath.Length
                ? normalizedPath.Substring(index + 1)
                : normalizedPath;
        }

    }

}
