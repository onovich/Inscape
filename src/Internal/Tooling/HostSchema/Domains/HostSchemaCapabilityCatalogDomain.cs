using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaCapabilityCatalogDomain {

        public static HostSchemaCapabilityCatalogModel Read(string workspacePath,
                                                            string? hostSchemaPath,
                                                            JsonSerializerOptions jsonOptions) {
            HostSchemaQueryReadResultModel queryResult = HostSchemaQueryReaderDomain.Read(hostSchemaPath, jsonOptions);
            HostSchemaActionReadResultModel actionResult = HostSchemaActionReaderDomain.Read(hostSchemaPath, jsonOptions);
            HostSchemaEventReadResultModel eventResult = HostSchemaEventReaderDomain.Read(hostSchemaPath, jsonOptions);

            HostSchemaCapabilityCatalogModel catalog = new HostSchemaCapabilityCatalogModel {
                Workspace = Path.GetFullPath(workspacePath),
                HostSchema = new HostSchemaCapabilitySourceModel {
                    ConfiguredPath = queryResult.ConfiguredPath ?? actionResult.ConfiguredPath ?? eventResult.ConfiguredPath,
                    ResolvedPath = queryResult.ResolvedPath ?? actionResult.ResolvedPath ?? eventResult.ResolvedPath,
                    Loaded = queryResult.Loaded || actionResult.Loaded || eventResult.Loaded,
                    ErrorMessage = queryResult.ErrorMessage ?? actionResult.ErrorMessage ?? eventResult.ErrorMessage,
                },
                Queries = queryResult.Queries,
                Actions = actionResult.Actions,
                Events = eventResult.Events,
            };

            return catalog;
        }

    }

}
