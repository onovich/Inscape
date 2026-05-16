namespace Inscape.Tooling {

    public sealed class HostSchemaEventCapabilityModel {

        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string Delivery { get; set; } = "fire-and-forget";

        public bool SideEffects { get; set; } = true;

        public List<HostSchemaParameterModel> Parameters { get; set; } = new List<HostSchemaParameterModel>();

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

        public bool IsNamedHostEvent {
            get {
                return IsEventName(Name);
            }
        }

        static bool IsEventName(string value) {
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
