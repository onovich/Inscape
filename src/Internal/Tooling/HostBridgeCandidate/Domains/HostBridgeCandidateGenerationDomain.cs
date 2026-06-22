using System.Globalization;
using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostBridgeCandidateGenerationDomain {

        const string UsageManifestPath = "usage/usage.json";
        const string HostSchemaCapabilitiesPath = "host/host-schema-capabilities.json";
        const string HostIntegrationAuditPath = "host/host-integration-audit.json";

        public static bool TryCreateFromPackage(string packageDirectoryPath,
                                                JsonSerializerOptions jsonOptions,
                                                out HostBridgeCandidateModel candidate,
                                                out string? errorMessage,
                                                out int exitCode) {
            if (!HostIntegrationPackageReaderDomain.TryReadPackage(packageDirectoryPath,
                                                                   jsonOptions,
                                                                   out HostIntegrationPackageReadResultModel package,
                                                                   out errorMessage,
                                                                   out exitCode)) {
                candidate = CreatePackageReadFailureCandidate(errorMessage);
                return false;
            }

            candidate = CreateFromPackage(package, jsonOptions);
            errorMessage = null;
            exitCode = 0;
            return true;
        }

        public static HostBridgeCandidateModel CreateFromPackage(HostIntegrationPackageReadResultModel package,
                                                                 JsonSerializerOptions jsonOptions) {
            HostBridgeCandidateModel candidate = CreateBaseCandidate(package.Manifest);

            if (TryApplyArtifactBlock(package, candidate, out string? blockedResult)) {
                candidate.Summary.Result = blockedResult ?? "blocked";
                return candidate;
            }

            if (!TryReadArtifact(package.PackageDirectoryPath,
                                 UsageManifestPath,
                                 jsonOptions,
                                 candidate,
                                 "usage-manifest",
                                 out UsageManifestModel? usage)
                || usage == null) {
                candidate.Summary.Result = "blocked";
                return candidate;
            }

            if (!TryReadArtifact(package.PackageDirectoryPath,
                                 HostSchemaCapabilitiesPath,
                                 jsonOptions,
                                 candidate,
                                 "host-schema-capabilities",
                                 out HostSchemaCapabilityCatalogModel? hostSchema)
                || hostSchema == null) {
                candidate.Summary.Result = "blocked";
                return candidate;
            }

            if (!TryReadArtifact(package.PackageDirectoryPath,
                                 HostIntegrationAuditPath,
                                 jsonOptions,
                                 candidate,
                                 "host-integration-audit",
                                 out HostIntegrationAuditModel? audit)
                || audit == null) {
                candidate.Summary.Result = "blocked";
                return candidate;
            }

            HashSet<string> actionNames = CreateActionNameSet(hostSchema);
            HashSet<string> queryNames = CreateQueryNameSet(hostSchema);
            HashSet<string> candidateIds = new HashSet<string>(StringComparer.Ordinal);

            for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                AddCandidateForDiagnostic(candidate,
                                          candidateIds,
                                          usage,
                                          actionNames,
                                          queryNames,
                                          audit.Diagnostics[i]);
            }

            FinalizeSummary(candidate);
            return candidate;
        }

        static HostBridgeCandidateModel CreateBaseCandidate(HostIntegrationPackageManifestModel manifest) {
            return new HostBridgeCandidateModel {
                CreatedAtUtc = manifest.CreatedAtUtc,
                Profile = new HostBridgeCandidateProfileModel {
                    Kind = string.IsNullOrWhiteSpace(manifest.Profile.Kind) ? "generic" : manifest.Profile.Kind,
                    Partner = manifest.Profile.Partner,
                    Purpose = string.IsNullOrWhiteSpace(manifest.Profile.Purpose) ? "static-artifact-poc" : manifest.Profile.Purpose,
                },
                SourceArtifacts = new HostBridgeCandidateSourceArtifactsModel(),
                Summary = new HostBridgeCandidateSummaryModel {
                    Result = "empty",
                    WritesHostData = false,
                },
            };
        }

        static HostBridgeCandidateModel CreatePackageReadFailureCandidate(string? errorMessage) {
            string result = "invalid";
            if (!string.IsNullOrWhiteSpace(errorMessage)
                && errorMessage.Contains("formatVersion", StringComparison.OrdinalIgnoreCase)) {
                result = "incompatible";
            }

            HostBridgeCandidateModel candidate = new HostBridgeCandidateModel {
                Summary = new HostBridgeCandidateSummaryModel {
                    Result = result,
                    WritesHostData = false,
                },
            };
            candidate.Diagnostics.Add(new HostBridgeCandidateDiagnosticModel {
                Severity = "error",
                Code = result == "incompatible" ? "HBC002" : "HBC003",
                Message = errorMessage ?? "Host Integration Package could not be read.",
            });
            return candidate;
        }

        static bool TryApplyArtifactBlock(HostIntegrationPackageReadResultModel package,
                                          HostBridgeCandidateModel candidate,
                                          out string? result) {
            result = null;

            string[] requiredPaths = new[] {
                UsageManifestPath,
                HostSchemaCapabilitiesPath,
                HostIntegrationAuditPath,
            };

            for (int i = 0; i < requiredPaths.Length; i += 1) {
                HostIntegrationPackageArtifactReadModel? artifact = FindArtifact(package, requiredPaths[i]);
                if (artifact == null) {
                    AddDiagnostic(candidate,
                                  "HBC001",
                                  "Required package artifact is not ready: " + requiredPaths[i] + " (missing)");
                    result = "blocked";
                    return true;
                }

                if (artifact.Status == "incompatible") {
                    AddDiagnostic(candidate,
                                  "HBC002",
                                  "Package artifact is incompatible: " + artifact.Artifact.Path + DetailSuffix(artifact.Message));
                    result = "incompatible";
                    return true;
                }

                if (artifact.Status == "invalid") {
                    AddDiagnostic(candidate,
                                  "HBC003",
                                  "Package artifact is invalid: " + artifact.Artifact.Path + DetailSuffix(artifact.Message));
                    result = "invalid";
                    return true;
                }
                if (artifact.Status != "ready") {
                    AddDiagnostic(candidate,
                                  "HBC001",
                                  "Required package artifact is not ready: " + artifact.Artifact.Path + " (" + artifact.Status + ")");
                    result = "blocked";
                    return true;
                }
            }

            return false;
        }

        static HostIntegrationPackageArtifactReadModel? FindArtifact(HostIntegrationPackageReadResultModel package,
                                                                     string packagePath) {
            for (int i = 0; i < package.Artifacts.Count; i += 1) {
                if (package.Artifacts[i].Artifact.Path == packagePath) {
                    return package.Artifacts[i];
                }
            }

            return null;
        }

        static bool TryReadArtifact<T>(string packageDirectoryPath,
                                       string packagePath,
                                       JsonSerializerOptions jsonOptions,
                                       HostBridgeCandidateModel candidate,
                                       string artifactKind,
                                       out T? artifact) {
            bool read = HostIntegrationPackageReaderDomain.TryReadJsonArtifact(packageDirectoryPath,
                                                                               packagePath,
                                                                               jsonOptions,
                                                                               out artifact,
                                                                               out string? errorMessage);
            if (!read || artifact == null) {
                AddDiagnostic(candidate,
                              "HBC004",
                              "Candidate generator could not read " + artifactKind + ": " + (errorMessage ?? packagePath));
                return false;
            }

            return true;
        }

        static void AddCandidateForDiagnostic(HostBridgeCandidateModel candidate,
                                              HashSet<string> candidateIds,
                                              UsageManifestModel usage,
                                              HashSet<string> actionNames,
                                              HashSet<string> queryNames,
                                              HostIntegrationAuditDiagnosticModel diagnostic) {
            if (diagnostic.Code == "HIA001") {
                AddSchemaCapabilityCandidate(candidate,
                                             candidateIds,
                                             diagnostic,
                                             "query",
                                             "hostSchema.queries[]");
                return;
            }

            if (diagnostic.Code == "HIA002") {
                AddSchemaCapabilityCandidate(candidate,
                                             candidateIds,
                                             diagnostic,
                                             "action",
                                             "hostSchema.actions[]");
                return;
            }

            if (diagnostic.Code == "HIA004") {
                AddIdOrResourceCandidate(candidate,
                                         candidateIds,
                                         usage,
                                         diagnostic);
                return;
            }

            if (diagnostic.Code == "HIA007") {
                if (actionNames.Contains(diagnostic.SubjectName)) {
                    AddHandlerCandidate(candidate,
                                        candidateIds,
                                        diagnostic,
                                        "action-handler",
                                        "action",
                                        "actions[]");
                } else {
                    AddSchemaCapabilityCandidate(candidate,
                                                 candidateIds,
                                                 diagnostic,
                                                 "action",
                                                 "hostSchema.actions[]");
                }

                return;
            }

            if (diagnostic.Code == "HIA008") {
                if (queryNames.Contains(diagnostic.SubjectName)) {
                    AddHandlerCandidate(candidate,
                                        candidateIds,
                                        diagnostic,
                                        "query-handler",
                                        "query",
                                        "queries[]");
                } else {
                    AddSchemaCapabilityCandidate(candidate,
                                                 candidateIds,
                                                 diagnostic,
                                                 "query",
                                                 "hostSchema.queries[]");
                }

                return;
            }

            if (IsErrorDiagnostic(diagnostic)) {
                AddDiagnostic(candidate,
                              diagnostic.Code,
                              diagnostic.Message);
            }
        }

        static void AddSchemaCapabilityCandidate(HostBridgeCandidateModel candidate,
                                                 HashSet<string> candidateIds,
                                                 HostIntegrationAuditDiagnosticModel diagnostic,
                                                 string subjectKind,
                                                 string bridgeTarget) {
            HostBridgeCandidateItemModel item = CreateCandidate(candidateIds,
                                                                "schema-capability",
                                                                "blocked",
                                                                subjectKind,
                                                                diagnostic.SubjectName,
                                                                HostIntegrationAuditPath,
                                                                "host-integration-diagnostic",
                                                                diagnostic.Message,
                                                                diagnostic.Source,
                                                                bridgeTarget,
                                                                diagnostic.Code);
            item.Confidence.Level = "none";
            item.Confidence.Score = 0m;
            item.Review.Decision = "needs-schema";
            item.ProposedMapping.Notes = "The Host Schema must declare this capability before a bridge handler candidate can be reviewed.";
            candidate.Candidates.Add(item);
        }

        static void AddIdOrResourceCandidate(HostBridgeCandidateModel candidate,
                                             HashSet<string> candidateIds,
                                             UsageManifestModel usage,
                                             HostIntegrationAuditDiagnosticModel diagnostic) {
            UsageManifestRequiredIdModel? requiredId = FindRequiredId(usage,
                                                                      diagnostic.SubjectKind,
                                                                      diagnostic.SubjectName);
            string candidateKind = diagnostic.SubjectKind == "resource" ? "resource-binding" : "id-binding";
            string artifact = requiredId == null ? HostIntegrationAuditPath : UsageManifestPath;
            string demandKind = requiredId == null ? "host-integration-diagnostic" : "required-id";
            string reason = requiredId == null ? diagnostic.Message : requiredId.Reason;
            UsageManifestSourceLocationModel source = requiredId == null ? diagnostic.Source : requiredId.Source;

            HostBridgeCandidateItemModel item = CreateCandidate(candidateIds,
                                                                candidateKind,
                                                                "candidate",
                                                                diagnostic.SubjectKind,
                                                                diagnostic.SubjectName,
                                                                artifact,
                                                                demandKind,
                                                                reason,
                                                                source,
                                                                candidateKind == "resource-binding" ? "resources[]" : "ids[]",
                                                                diagnostic.Code);
            item.Confidence.Level = "low";
            item.Confidence.Score = 0.35m;
            item.Confidence.Reasons.Add("Derived from a missing Host Bridge binding diagnostic.");
            candidate.Candidates.Add(item);
        }

        static void AddHandlerCandidate(HostBridgeCandidateModel candidate,
                                        HashSet<string> candidateIds,
                                        HostIntegrationAuditDiagnosticModel diagnostic,
                                        string candidateKind,
                                        string subjectKind,
                                        string bridgeTarget) {
            HostBridgeCandidateItemModel item = CreateCandidate(candidateIds,
                                                                candidateKind,
                                                                "candidate",
                                                                subjectKind,
                                                                diagnostic.SubjectName,
                                                                HostIntegrationAuditPath,
                                                                "host-integration-diagnostic",
                                                                diagnostic.Message,
                                                                diagnostic.Source,
                                                                bridgeTarget,
                                                                diagnostic.Code);
            item.Confidence.Level = "low";
            item.Confidence.Score = 0.4m;
            item.Confidence.Reasons.Add("Host Schema declares the capability and audit found no confirmed Host Bridge handler.");
            candidate.Candidates.Add(item);
        }

        static HostBridgeCandidateItemModel CreateCandidate(HashSet<string> candidateIds,
                                                           string candidateKind,
                                                           string status,
                                                           string subjectKind,
                                                           string subjectName,
                                                           string artifact,
                                                           string demandKind,
                                                           string reason,
                                                           UsageManifestSourceLocationModel source,
                                                           string bridgeTarget,
                                                           string diagnosticCode) {
            string id = CreateUniqueCandidateId(candidateIds,
                                                candidateKind,
                                                subjectKind,
                                                subjectName);
            return new HostBridgeCandidateItemModel {
                Id = id,
                CandidateKind = candidateKind,
                Status = status,
                Subject = new HostBridgeCandidateSubjectModel {
                    Kind = subjectKind,
                    Name = subjectName,
                },
                Demand = new HostBridgeCandidateDemandModel {
                    Artifact = artifact,
                    Kind = demandKind,
                    Reason = reason,
                    Source = CreateSourceRef(source),
                },
                ProposedMapping = new HostBridgeCandidateProposedMappingModel {
                    BridgeTarget = bridgeTarget,
                    SuggestedName = subjectName,
                },
                Confidence = new HostBridgeCandidateConfidenceModel(),
                Review = new HostBridgeCandidateReviewModel(),
                Ownership = new HostBridgeCandidateOwnershipModel(),
                DiagnosticCode = diagnosticCode,
            };
        }

        static UsageManifestRequiredIdModel? FindRequiredId(UsageManifestModel usage,
                                                            string kind,
                                                            string name) {
            for (int i = 0; i < usage.RequiredIds.Count; i += 1) {
                UsageManifestRequiredIdModel requiredId = usage.RequiredIds[i];
                if (string.Equals(requiredId.Kind, kind, StringComparison.Ordinal)
                    && string.Equals(requiredId.Name, name, StringComparison.Ordinal)) {
                    return requiredId;
                }
            }

            return null;
        }

        static HostBridgeCandidateSourceRefModel CreateSourceRef(UsageManifestSourceLocationModel source) {
            return new HostBridgeCandidateSourceRefModel {
                Path = source.Path,
                Line = source.Line,
                Column = source.Column,
                Length = source.Length,
                CoordinateSystem = "compiler-1-based",
            };
        }

        static HashSet<string> CreateActionNameSet(HostSchemaCapabilityCatalogModel hostSchema) {
            HashSet<string> actionNames = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < hostSchema.Actions.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(hostSchema.Actions[i].Name)) {
                    actionNames.Add(hostSchema.Actions[i].Name);
                }
            }

            return actionNames;
        }

        static HashSet<string> CreateQueryNameSet(HostSchemaCapabilityCatalogModel hostSchema) {
            HashSet<string> queryNames = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < hostSchema.Queries.Count; i += 1) {
                if (!string.IsNullOrWhiteSpace(hostSchema.Queries[i].Name)) {
                    queryNames.Add(hostSchema.Queries[i].Name);
                }
            }

            return queryNames;
        }

        static void FinalizeSummary(HostBridgeCandidateModel candidate) {
            int blockedCount = 0;
            int conflictCount = 0;
            for (int i = 0; i < candidate.Candidates.Count; i += 1) {
                if (candidate.Candidates[i].Status == "blocked") {
                    blockedCount += 1;
                }

                if (candidate.Candidates[i].Status == "conflict") {
                    conflictCount += 1;
                }
            }

            candidate.Summary.CandidateCount = candidate.Candidates.Count;
            candidate.Summary.BlockedCount = blockedCount;
            candidate.Summary.ConflictCount = conflictCount;
            candidate.Summary.WritesHostData = false;

            if (candidate.Candidates.Count == 0) {
                candidate.Summary.Result = candidate.Diagnostics.Count == 0 ? "empty" : "blocked";
            } else if (blockedCount > 0) {
                candidate.Summary.Result = "blocked";
            } else {
                candidate.Summary.Result = "ready";
            }
        }

        static string CreateUniqueCandidateId(HashSet<string> candidateIds,
                                              string candidateKind,
                                              string subjectKind,
                                              string subjectName) {
            string root = "candidate_" + Sanitize(candidateKind) + "_" + Sanitize(subjectKind) + "_" + Sanitize(subjectName);
            string id = root;
            int suffix = 2;
            while (candidateIds.Contains(id)) {
                id = root + "_" + suffix.ToString(CultureInfo.InvariantCulture);
                suffix += 1;
            }

            candidateIds.Add(id);
            return id;
        }

        static string Sanitize(string value) {
            StringBuilder builder = new StringBuilder();
            bool previousWasSeparator = false;
            for (int i = 0; i < value.Length; i += 1) {
                char current = value[i];
                if ((current >= 'A' && current <= 'Z')
                    || (current >= 'a' && current <= 'z')
                    || (current >= '0' && current <= '9')) {
                    builder.Append(char.ToLowerInvariant(current));
                    previousWasSeparator = false;
                } else if (!previousWasSeparator) {
                    builder.Append('_');
                    previousWasSeparator = true;
                }
            }

            string sanitized = builder.ToString().Trim('_');
            return sanitized.Length == 0 ? "item" : sanitized;
        }

        static bool IsErrorDiagnostic(HostIntegrationAuditDiagnosticModel diagnostic) {
            return string.Equals(diagnostic.Severity, "error", StringComparison.OrdinalIgnoreCase);
        }

        static void AddDiagnostic(HostBridgeCandidateModel candidate,
                                  string code,
                                  string message) {
            candidate.Diagnostics.Add(new HostBridgeCandidateDiagnosticModel {
                Severity = "error",
                Code = code,
                Message = message,
            });
        }

        static string DetailSuffix(string? message) {
            return string.IsNullOrWhiteSpace(message) ? string.Empty : " (" + message + ")";
        }

    }

}
