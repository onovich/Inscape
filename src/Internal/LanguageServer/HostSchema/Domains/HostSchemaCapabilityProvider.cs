using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class HostSchemaCapabilityProvider {

        public HostSchemaCapabilityCatalogModel GetCapabilities(string rootPath,
                                                                 string? configuredPath,
                                                                 JsonSerializerOptions jsonOptions) {
            string workspacePath = Path.GetFullPath(rootPath);
            if (!Directory.Exists(workspacePath)) {
                return CreateErrorCatalog(workspacePath, "Project root not found: " + workspacePath);
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(workspacePath,
                                                             configuredPath,
                                                             jsonOptions,
                                                             out ToolConfigModel config,
                                                             out string? errorMessage)) {
                return CreateErrorCatalog(workspacePath, errorMessage ?? "Invalid project config.");
            }

            return HostSchemaCapabilityCatalogDomain.Read(workspacePath, config.HostSchema, jsonOptions);
        }

        static HostSchemaCapabilityCatalogModel CreateErrorCatalog(string workspacePath, string errorMessage) {
            return new HostSchemaCapabilityCatalogModel {
                Workspace = workspacePath,
                HostSchema = new HostSchemaCapabilitySourceModel {
                    ErrorMessage = errorMessage
                }
            };
        }

    }

}
