using System.Text.Json;

namespace Inscape.Cli {

    static class CliHostSchemaTemplateWriter {

        public static string Write(JsonSerializerOptions jsonOptions) {
            CliHostSchemaTemplate template = new CliHostSchemaTemplate {
                Queries = new List<CliHostSchemaQuery> {
                    new CliHostSchemaQuery {
                        Name = "has_item",
                        Description = "Pure query example. The DSL may reference it later, but the host owns execution.",
                        ReturnType = "bool",
                        IsAsync = false,
                        Parameters = new List<CliHostSchemaParameter> {
                            new CliHostSchemaParameter {
                                Name = "itemId",
                                Type = "string",
                                Required = true,
                                Description = "Stable item identifier owned by the host."
                            }
                        }
                    }
                },
                Events = new List<CliHostSchemaEvent> {
                    new CliHostSchemaEvent {
                        Name = "open_window",
                        Description = "Host event example. Inscape only records the intent; the host decides behavior.",
                        Delivery = "fire-and-forget",
                        SideEffects = true,
                        Parameters = new List<CliHostSchemaParameter> {
                            new CliHostSchemaParameter {
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

    sealed class CliHostSchemaTemplate {

        public string Format { get; set; } = "inscape.host-schema";

        public int FormatVersion { get; set; } = 1;

        public List<CliHostSchemaQuery> Queries { get; set; } = new List<CliHostSchemaQuery>();

        public List<CliHostSchemaEvent> Events { get; set; } = new List<CliHostSchemaEvent>();

    }

    sealed class CliHostSchemaQuery {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string ReturnType { get; set; } = string.Empty;

        public bool IsAsync { get; set; }

        public List<CliHostSchemaParameter> Parameters { get; set; } = new List<CliHostSchemaParameter>();

    }

    sealed class CliHostSchemaEvent {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Delivery { get; set; } = string.Empty;

        public bool SideEffects { get; set; }

        public List<CliHostSchemaParameter> Parameters { get; set; } = new List<CliHostSchemaParameter>();

    }

    sealed class CliHostSchemaParameter {

        public string Name { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public bool Required { get; set; }

        public string Description { get; set; } = string.Empty;

    }

}