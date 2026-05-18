using System.Text;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public sealed class LanguageServerSessionController {

        readonly JsonSerializerOptions jsonOptions;
        bool shutdownRequested;

        public LanguageServerSessionController() {
            jsonOptions = new JsonSerializerOptions {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        public void Run(Stream input, Stream output) {
            while (TryReadMessage(input, out string? payload)) {
                if (string.IsNullOrWhiteSpace(payload)) {
                    continue;
                }

                bool shouldExit = HandleMessage(payload, output);
                if (shouldExit) {
                    return;
                }
            }
        }

        bool HandleMessage(string payload, Stream output) {
            using JsonDocument document = JsonDocument.Parse(payload);
            JsonElement root = document.RootElement;
            string method = root.TryGetProperty("method", out JsonElement methodProperty)
                ? methodProperty.GetString() ?? string.Empty
                : string.Empty;

            int? requestId = root.TryGetProperty("id", out JsonElement idProperty) && idProperty.ValueKind == JsonValueKind.Number
                ? idProperty.GetInt32()
                : null;

            JsonElement? parameters = root.TryGetProperty("params", out JsonElement paramsProperty)
                ? paramsProperty
                : null;

            if (method == "initialized") {
                return false;
            }

            if (method == "exit") {
                return true;
            }

            if (requestId == null) {
                return false;
            }

            if (method == "initialize") {
                WriteResult(output, requestId.Value, new {
                    capabilities = new { },
                    serverInfo = new {
                        name = "Inscape.LanguageServer"
                    }
                });
                return false;
            }

            if (method == "shutdown") {
                shutdownRequested = true;
                WriteResult(output, requestId.Value, (object?)null);
                return false;
            }

            if (shutdownRequested) {
                WriteError(output, requestId.Value, -32600, "LanguageServer session is shut down.");
                return false;
            }

            try {
                object? result = method switch {
                    "inscape/diagnoseProject" => HandleDiagnoseProject(parameters),
                    "inscape/definitionProject" => HandleDefinitionProject(parameters),
                    "inscape/referencesProject" => HandleReferencesProject(parameters),
                    "inscape/completionProject" => HandleCompletionProject(parameters),
                    "inscape/documentSymbolsFile" => HandleDocumentSymbolsFile(parameters),
                    "inscape/hoverProject" => HandleHoverProject(parameters),
                    "inscape/hostSchemaCapabilitiesProject" => HandleHostSchemaCapabilitiesProject(parameters),
                    _ => throw new InvalidOperationException("Unknown LanguageServer session method: " + method)
                };

                WriteResult(output, requestId.Value, result);
            } catch (Exception error) {
                WriteError(output, requestId.Value, -32603, error.Message);
            }

            return false;
        }

        object HandleDiagnoseProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            DslScriptProjectDiagnosticProvider provider = new DslScriptProjectDiagnosticProvider();
            return new {
                format = "inscape.language-server-project-diagnostics",
                formatVersion = 1,
                rootPath = Path.GetFullPath(rootPath),
                diagnostics = provider.GetDiagnostics(rootPath,
                                                      ReadSourceOverride(parameters),
                                                      ReadOptionalString(parameters, "entryTitle") ?? string.Empty)
            };
        }

        object HandleDefinitionProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            string target = ReadRequiredString(parameters, "target");
            DslScriptProjectNavigationProvider provider = new DslScriptProjectNavigationProvider();
            return new {
                format = "inscape.language-server-project-definition",
                formatVersion = 1,
                rootPath = Path.GetFullPath(rootPath),
                definition = provider.GetNodeDefinition(rootPath, target, ReadSourceOverride(parameters))
            };
        }

        object HandleReferencesProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            string target = ReadRequiredString(parameters, "target");
            DslScriptProjectNavigationProvider provider = new DslScriptProjectNavigationProvider();
            return new {
                format = "inscape.language-server-project-references",
                formatVersion = 1,
                rootPath = Path.GetFullPath(rootPath),
                references = provider.GetNodeReferences(rootPath, target, ReadSourceOverride(parameters))
            };
        }

        object HandleCompletionProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            DslScriptCompletionProvider provider = new DslScriptCompletionProvider();
            return new {
                format = "inscape.language-server-project-completions",
                formatVersion = 1,
                rootPath = Path.GetFullPath(rootPath),
                completions = provider.GetProjectNodeCompletions(rootPath, ReadSourceOverride(parameters))
            };
        }

        object HandleDocumentSymbolsFile(JsonElement? parameters) {
            string sourcePath = ReadRequiredString(parameters, "sourcePath");
            string fullSourcePath = Path.GetFullPath(sourcePath);
            string source = File.ReadAllText(fullSourcePath);
            DslScriptDocumentSymbolProvider provider = new DslScriptDocumentSymbolProvider();
            return new {
                format = "inscape.language-server-document-symbols",
                formatVersion = 1,
                symbols = provider.GetDocumentSymbols(source, fullSourcePath)
            };
        }

        object HandleHoverProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            string kind = ReadRequiredString(parameters, "kind");
            string target = ReadRequiredString(parameters, "target");
            DslScriptHoverProvider provider = new DslScriptHoverProvider();
            LanguageServerHoverModel? hover = kind == "jump"
                ? provider.GetProjectJumpHover(rootPath, target, ReadSourceOverride(parameters))
                : provider.GetProjectNodeHover(rootPath, target, ReadSourceOverride(parameters));
            return new {
                format = "inscape.language-server-project-hover",
                formatVersion = 1,
                rootPath = Path.GetFullPath(rootPath),
                hover
            };
        }

        object HandleHostSchemaCapabilitiesProject(JsonElement? parameters) {
            string rootPath = ReadRequiredString(parameters, "rootPath");
            HostSchemaCapabilityProvider provider = new HostSchemaCapabilityProvider();
            return provider.GetCapabilities(rootPath,
                                            ReadOptionalString(parameters, "configPath"),
                                            CreateJsonOptions());
        }

        static bool TryReadMessage(Stream input, out string? payload) {
            payload = null;
            List<byte> headerBytes = new List<byte>();
            byte[] singleByte = new byte[1];

            while (true) {
                int bytesRead = input.Read(singleByte, 0, 1);
                if (bytesRead == 0) {
                    if (headerBytes.Count > 0) {
                        throw new InvalidOperationException("Unexpected end of stream while reading LanguageServer session header.");
                    }

                    return false;
                }

                headerBytes.Add(singleByte[0]);
                int count = headerBytes.Count;
                if (count >= 4
                    && headerBytes[count - 4] == '\r'
                    && headerBytes[count - 3] == '\n'
                    && headerBytes[count - 2] == '\r'
                    && headerBytes[count - 1] == '\n') {
                    break;
                }
            }

            string headerText = Encoding.ASCII.GetString(headerBytes.ToArray());
            int contentLength = 0;
            foreach (string headerLine in headerText.Split(new[] { "\r\n" }, StringSplitOptions.RemoveEmptyEntries)) {
                if (headerLine.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) {
                    string lengthText = headerLine.Substring("Content-Length:".Length).Trim();
                    contentLength = int.Parse(lengthText);
                    break;
                }
            }

            if (contentLength <= 0) {
                throw new InvalidOperationException("LanguageServer session message is missing Content-Length.");
            }

            byte[] bodyBytes = new byte[contentLength];
            int offset = 0;
            while (offset < contentLength) {
                int bytesRead = input.Read(bodyBytes, offset, contentLength - offset);
                if (bytesRead == 0) {
                    throw new InvalidOperationException("Unexpected end of stream while reading LanguageServer session body.");
                }

                offset += bytesRead;
            }

            payload = Encoding.UTF8.GetString(bodyBytes);
            return true;
        }

        void WriteResult(Stream output, int requestId, object? result) {
            WriteMessage(output, writer => {
                writer.WriteStartObject();
                writer.WriteString("jsonrpc", "2.0");
                writer.WriteNumber("id", requestId);
                writer.WritePropertyName("result");
                JsonSerializer.Serialize(writer, result, jsonOptions);
                writer.WriteEndObject();
            });
        }

        void WriteError(Stream output, int requestId, int code, string message) {
            WriteMessage(output, writer => {
                writer.WriteStartObject();
                writer.WriteString("jsonrpc", "2.0");
                writer.WriteNumber("id", requestId);
                writer.WritePropertyName("error");
                writer.WriteStartObject();
                writer.WriteNumber("code", code);
                writer.WriteString("message", message);
                writer.WriteEndObject();
                writer.WriteEndObject();
            });
        }

        static void WriteMessage(Stream output, Action<Utf8JsonWriter> writePayload) {
            using MemoryStream payloadStream = new MemoryStream();
            using (Utf8JsonWriter writer = new Utf8JsonWriter(payloadStream)) {
                writePayload(writer);
            }

            byte[] payloadBytes = payloadStream.ToArray();
            byte[] headerBytes = Encoding.ASCII.GetBytes("Content-Length: " + payloadBytes.Length + "\r\n\r\n");
            output.Write(headerBytes, 0, headerBytes.Length);
            output.Write(payloadBytes, 0, payloadBytes.Length);
            output.Flush();
        }

        static string ReadRequiredString(JsonElement? parameters, string propertyName) {
            string? value = ReadOptionalString(parameters, propertyName);
            if (string.IsNullOrWhiteSpace(value)) {
                throw new InvalidOperationException("LanguageServer session parameter is required: " + propertyName);
            }

            return value;
        }

        static string? ReadOptionalString(JsonElement? parameters, string propertyName) {
            if (parameters == null || !parameters.Value.TryGetProperty(propertyName, out JsonElement property)) {
                return null;
            }

            return property.ValueKind == JsonValueKind.String ? property.GetString() : null;
        }

        static DslScriptSourceOverrideModel? ReadSourceOverride(JsonElement? parameters) {
            string? sourcePath = ReadOptionalString(parameters, "overrideSourcePath");
            string? contentPath = ReadOptionalString(parameters, "overrideContentPath");
            if (string.IsNullOrWhiteSpace(sourcePath) || string.IsNullOrWhiteSpace(contentPath)) {
                return null;
            }

            return new DslScriptSourceOverrideModel(sourcePath, contentPath);
        }

        static JsonSerializerOptions CreateJsonOptions() {
            return new JsonSerializerOptions {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

    }

}
