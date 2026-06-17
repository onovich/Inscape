using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaEventReaderDomain {

        public static HostSchemaEventReadResultModel Read(string? hostSchemaPath, JsonSerializerOptions jsonOptions) {
            HostSchemaEventReadResultModel result = new HostSchemaEventReadResultModel {
                ConfiguredPath = hostSchemaPath,
                ResolvedPath = hostSchemaPath,
            };

            if (string.IsNullOrWhiteSpace(hostSchemaPath)) {
                return result;
            }

            if (!File.Exists(hostSchemaPath)) {
                result.ErrorMessage = "Host Schema not found: " + hostSchemaPath;
                return result;
            }

            try {
                string text = File.ReadAllText(hostSchemaPath, Encoding.UTF8);
                HostSchemaEventDocumentModel? parsed = JsonSerializer.Deserialize<HostSchemaEventDocumentModel>(text, jsonOptions);
                result.Loaded = true;
                result.Events = NormalizeEvents(parsed, hostSchemaPath, text);
                return result;
            } catch (Exception ex) {
                result.ErrorMessage = "Invalid Host Schema '" + hostSchemaPath + "': " + ex.Message;
                return result;
            }
        }

        static List<HostSchemaEventCapabilityModel> NormalizeEvents(HostSchemaEventDocumentModel? document,
                                                                    string sourcePath,
                                                                    string text) {
            List<HostSchemaEventCapabilityModel> events = new List<HostSchemaEventCapabilityModel>();
            if (document == null || document.Events == null) {
                return events;
            }

            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < document.Events.Count; i += 1) {
                HostSchemaEventCapabilityModel hostEvent = document.Events[i];
                string name = (hostEvent.Name ?? string.Empty).Trim();
                if (name.Length == 0 || seen.Contains(name)) {
                    continue;
                }

                seen.Add(name);
                SourceLocation location = FindEventLocation(text, name);
                hostEvent.Name = name;
                hostEvent.Description = hostEvent.Description ?? string.Empty;
                hostEvent.Delivery = string.IsNullOrWhiteSpace(hostEvent.Delivery)
                    ? "fire-and-forget"
                    : hostEvent.Delivery.Trim();
                hostEvent.Parameters = hostEvent.Parameters ?? new List<HostSchemaParameterModel>();
                hostEvent.SourcePath = sourcePath;
                hostEvent.Line = location.Line;
                hostEvent.Column = location.Column;
                hostEvent.Length = Math.Max(name.Length, 1);
                events.Add(hostEvent);
            }

            return events;
        }

        static SourceLocation FindEventLocation(string text, string eventName) {
            string[] lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            bool inEvents = false;
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i];
                if (!inEvents && line.Contains("\"events\"")) {
                    inEvents = true;
                    continue;
                }

                if (inEvents && (line.Contains("\"queries\"") || line.Contains("\"actions\""))) {
                    break;
                }

                if (!inEvents) {
                    continue;
                }

                int nameIndex = line.IndexOf("\"name\"", StringComparison.Ordinal);
                if (nameIndex < 0) {
                    continue;
                }

                int valueIndex = line.IndexOf("\"" + eventName + "\"", nameIndex, StringComparison.Ordinal);
                if (valueIndex >= 0) {
                    return new SourceLocation(i + 1, valueIndex + 2);
                }
            }

            return new SourceLocation(1, 1);
        }

        sealed class HostSchemaEventDocumentModel {

            public List<HostSchemaEventCapabilityModel> Events { get; set; } = new List<HostSchemaEventCapabilityModel>();

        }

        readonly struct SourceLocation {

            public int Line { get; }

            public int Column { get; }

            public SourceLocation(int line, int column) {
                Line = line;
                Column = column;
            }
        }

    }

}
