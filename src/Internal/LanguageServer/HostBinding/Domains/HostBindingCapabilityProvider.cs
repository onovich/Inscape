using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class HostBindingCapabilityProvider {

        public HostBindingCapabilityCatalogModel GetCapabilities(string rootPath,
                                                                  string? configuredPath,
                                                                  DslScriptSourceOverrideModel? sourceOverride,
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

            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(workspacePath, sourceOverride);
            return HostBindingCapabilityCatalogDomain.Read(workspacePath, config.HostBridge, sources);
        }

        static HostBindingCapabilityCatalogModel CreateErrorCatalog(string workspacePath, string errorMessage) {
            return new HostBindingCapabilityCatalogModel {
                Workspace = workspacePath,
                HostBridge = new HostBindingCapabilitySourceModel {
                    ErrorMessage = errorMessage
                }
            };
        }

    }

}
