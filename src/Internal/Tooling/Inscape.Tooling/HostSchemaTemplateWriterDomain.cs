using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaTemplateWriterDomain {

        public static string Write(JsonSerializerOptions jsonOptions) {
            HostSchemaTemplateModel template = new HostSchemaTemplateModel {
                Queries = new List<HostSchemaQueryModel> {
                    new HostSchemaQueryModel {
                        Name = "has_item",
                        Description = "Pure query example. The DSL may reference it later, but the host owns execution.",
                        ReturnType = "bool",
                        IsAsync = false,
                        Parameters = new List<HostSchemaParameterModel> {
                            new HostSchemaParameterModel {
                                Name = "itemId",
                                Type = "string",
                                Required = true,
                                Description = "Stable item identifier owned by the host."
                            }
                        }
                    }
                },
                Events = new List<HostSchemaEventModel> {
                    new HostSchemaEventModel {
                        Name = "open_window",
                        Description = "Host event example. Inscape only records the intent; the host decides behavior.",
                        Delivery = "fire-and-forget",
                        SideEffects = true,
                        Parameters = new List<HostSchemaParameterModel> {
                            new HostSchemaParameterModel {
                                Name = "windowId",
                                Type = "string",
                                Required = true,
                                Description = "Stable UI window identifier owned by the host."
                            }
                        }
                    }
                }
            };

            return JsonSerializer.Serialize(template, jsonOptions);
        }

    }

    public sealed class HostSchemaTemplateModel {

        public string Format { get; set; } = "inscape.host-schema";

        public int FormatVersion { get; set; } = 1;

        public List<HostSchemaQueryModel> Queries { get; set; } = new List<HostSchemaQueryModel>();

        public List<HostSchemaEventModel> Events { get; set; } = new List<HostSchemaEventModel>();

    }

    public sealed class HostSchemaQueryModel {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ReturnType { get; set; } = string.Empty;

        public bool IsAsync { get; set; }

        public List<HostSchemaParameterModel> Parameters { get; set; } = new List<HostSchemaParameterModel>();

    }

    public sealed class HostSchemaEventModel {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Delivery { get; set; } = string.Empty;

        public bool SideEffects { get; set; }

        public List<HostSchemaParameterModel> Parameters { get; set; } = new List<HostSchemaParameterModel>();

    }

    public sealed class HostSchemaParameterModel {

        public string Name { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public bool Required { get; set; }

        public string Description { get; set; } = string.Empty;

    }

}