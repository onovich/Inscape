namespace Inscape.Tooling {

    public sealed class HostSchemaActionCapabilityModel {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Mode { get; set; } = "fire";

        public string? IdKind { get; set; }

        public List<HostSchemaParameterModel> Parameters { get; set; } = new List<HostSchemaParameterModel>();

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

        public bool IsNamedHostAction {
            get {
                return IsActionName(Name);
            }
        }

        static bool IsActionName(string value) {
            string trimmed = value.Trim();
            if (trimmed.Length == 0 || !IsIdentifierStart(trimmed[0])) {
                return false;
            }

            for (int i = 1; i < trimmed.Length; i += 1) {
                char current = trimmed[i];
                if (!IsIdentifierPart(current) && current != '.' && current != '-') {
                    return false;
                }
            }

            return true;
        }

        static bool IsIdentifierStart(char value) {
            return value == '_' || (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
        }

        static bool IsIdentifierPart(char value) {
            return IsIdentifierStart(value) || (value >= '0' && value <= '9');
        }

    }

}
