using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class HostSchemaActionReaderDomain {

        public static HostSchemaActionReadResultModel Read(string? hostSchemaPath, JsonSerializerOptions jsonOptions) {
            HostSchemaActionReadResultModel result = new HostSchemaActionReadResultModel {
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
                HostSchemaActionDocumentModel? parsed = JsonSerializer.Deserialize<HostSchemaActionDocumentModel>(text, jsonOptions);
                result.Loaded = true;
                result.Actions = NormalizeActions(parsed, hostSchemaPath, text);
                return result;
            } catch (Exception ex) {
                result.ErrorMessage = "Invalid Host Schema '" + hostSchemaPath + "': " + ex.Message;
                return result;
            }
        }

        static List<HostSchemaActionCapabilityModel> NormalizeActions(HostSchemaActionDocumentModel? document,
                                                                      string sourcePath,
                                                                      string text) {
            List<HostSchemaActionCapabilityModel> actions = new List<HostSchemaActionCapabilityModel>();
            if (document == null || document.Actions == null) {
                return actions;
            }

            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < document.Actions.Count; i += 1) {
                HostSchemaActionCapabilityModel action = document.Actions[i];
                string name = (action.Name ?? string.Empty).Trim();
                if (name.Length == 0 || seen.Contains(name)) {
                    continue;
                }

                seen.Add(name);
                SourceLocation location = FindActionLocation(text, name);
                action.Name = name;
                action.Description = action.Description ?? string.Empty;
                action.Mode = string.IsNullOrWhiteSpace(action.Mode)
                    ? "fire"
                    : action.Mode.Trim();
                action.IdKind = string.IsNullOrWhiteSpace(action.IdKind)
                    ? null
                    : action.IdKind.Trim();
                action.Parameters = action.Parameters ?? new List<HostSchemaParameterModel>();
                action.SourcePath = sourcePath;
                action.Line = location.Line;
                action.Column = location.Column;
                action.Length = Math.Max(name.Length, 1);
                actions.Add(action);
            }

            return actions;
        }

        static SourceLocation FindActionLocation(string text, string actionName) {
            string[] lines = text.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
            bool inActions = false;
            for (int i = 0; i < lines.Length; i += 1) {
                string line = lines[i];
                if (!inActions && line.Contains("\"actions\"")) {
                    inActions = true;
                    continue;
                }

                if (inActions && (line.Contains("\"queries\"") || line.Contains("\"events\""))) {
                    break;
                }

                if (!inActions) {
                    continue;
                }

                int nameIndex = line.IndexOf("\"name\"", StringComparison.Ordinal);
                if (nameIndex < 0) {
                    continue;
                }

                int valueIndex = line.IndexOf("\"" + actionName + "\"", nameIndex, StringComparison.Ordinal);
                if (valueIndex >= 0) {
                    return new SourceLocation(i + 1, valueIndex + 2);
                }
            }

            return new SourceLocation(1, 1);
        }

        sealed class HostSchemaActionDocumentModel {

            public List<HostSchemaActionCapabilityModel> Actions { get; set; } = new List<HostSchemaActionCapabilityModel>();

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
