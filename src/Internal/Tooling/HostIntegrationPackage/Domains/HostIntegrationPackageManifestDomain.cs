namespace Inscape.Tooling {

    public static class HostIntegrationPackageManifestDomain {

        public const string ManifestFormat = "inscape.integration-package";

        public const int ManifestFormatVersion = 1;

        public static HostIntegrationPackageManifestModel Create(string workspaceRootPath, string createdAtUtc) {
            string fullWorkspacePath = Path.GetFullPath(workspaceRootPath);
            string workspaceName = new DirectoryInfo(fullWorkspacePath).Name;
            HostIntegrationPackageManifestModel manifest = new HostIntegrationPackageManifestModel {
                Format = ManifestFormat,
                FormatVersion = ManifestFormatVersion,
                CreatedAtUtc = createdAtUtc,
                Workspace = new HostIntegrationPackageWorkspaceModel {
                    Name = workspaceName,
                    RootPolicy = "workspace-relative",
                },
                Profile = new HostIntegrationPackageProfileModel {
                    Kind = "generic",
                    Partner = null,
                    Purpose = "static-artifact-poc",
                },
                Capabilities = new HostIntegrationPackageCapabilitiesModel {
                    RuntimeIntegration = false,
                    PreviewBridge = false,
                    WritesHostData = false,
                    ContainsHostDependency = false,
                },
            };

            AddArtifact(manifest, "manifest", "manifest.json", true, "ready", ManifestFormat, ManifestFormatVersion, "package");
            AddArtifact(manifest, "source-files", "source", true, "missing", "inscape.source-files", 1, "package");
            AddArtifact(manifest, "narrative-graph-ir", "graph/project-ir.json", true, "missing", "inscape.project-ir", 1, "compiler");
            AddArtifact(manifest, "usage-manifest", "usage/usage.json", true, "missing", "inscape.usage", 1, "tooling");
            AddArtifact(manifest, "host-schema-capabilities", "host/host-schema-capabilities.json", false, "missing", "inscape.host-schema.capabilities", 1, "tooling");
            AddArtifact(manifest, "host-integration-audit", "host/host-integration-audit.json", true, "missing", "inscape.host-integration.audit", 1, "tooling");
            AddArtifact(manifest, "localization-csv", "localization/l10n.csv", true, "missing", "text/csv", 1, "tooling");
            AddArtifact(manifest, "localization-anchor-map", "localization/anchor-map.json", true, "missing", "inscape.localization-anchor-map", 1, "tooling");
            AddArtifact(manifest, "source-locations", "source-map/source-locations.json", true, "missing", "inscape.source-locations", 1, "package");
            AddArtifact(manifest, "readiness-report", "reports/readiness-report.json", false, "missing", "inscape.host-integration.readiness-report", 1, "tooling");

            return manifest;
        }

        static void AddArtifact(HostIntegrationPackageManifestModel manifest,
                                string kind,
                                string path,
                                bool required,
                                string status,
                                string format,
                                int formatVersion,
                                string producerRole) {
            manifest.Artifacts.Add(new HostIntegrationPackageArtifactModel {
                Kind = kind,
                Path = HostIntegrationPackagePathDomain.NormalizeKnownArtifactPath(path),
                Required = required,
                Status = status,
                Format = format,
                FormatVersion = formatVersion,
                ProducerRole = producerRole,
            });
        }

    }

}
