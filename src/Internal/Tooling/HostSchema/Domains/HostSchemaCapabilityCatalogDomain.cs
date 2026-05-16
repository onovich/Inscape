using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaCapabilityCatalogDomain {

        public static HostSchemaCapabilityCatalogModel Read(string workspacePath,
                                                            string? hostSchemaPath,
                                                            JsonSerializerOptions jsonOptions) {
            HostSchemaQueryReadResultModel queryResult = HostSchemaQueryReaderDomain.Read(hostSchemaPath, jsonOptions);
            HostSchemaEventReadResultModel eventResult = HostSchemaEventReaderDomain.Read(hostSchemaPath, jsonOptions);

            HostSchemaCapabilityCatalogModel catalog = new HostSchemaCapabilityCatalogModel {
                Workspace = Path.GetFullPath(workspacePath),
                HostSchema = new HostSchemaCapabilitySourceModel {
                    ConfiguredPath = queryResult.ConfiguredPath ?? eventResult.ConfiguredPath,
                    ResolvedPath = queryResult.ResolvedPath ?? eventResult.ResolvedPath,
                    Loaded = queryResult.Loaded || eventResult.Loaded,
                    ErrorMessage = queryResult.ErrorMessage ?? eventResult.ErrorMessage,
                },
                Queries = queryResult.Queries,
                Events = eventResult.Events,
            };

            return catalog;
        }

    }

}
