namespace Inscape.Tooling {

    public sealed class HostSchemaQueryCapabilityModel {

        public string Name { get; set; } = string.Empty;

        public string ReturnType { get; set; } = string.Empty;

        public bool IsAsync { get; set; }

        public string Description { get; set; } = string.Empty;

        public List<HostSchemaParameterModel> Parameters { get; set; } = new List<HostSchemaParameterModel>();

        public string SourcePath { get; set; } = string.Empty;

        public int Line { get; set; }

        public int Column { get; set; }

        public int Length { get; set; }

        public bool IsSimpleTextInterpolationQuery {
            get {
                return IsSimpleQueryPath(Name) && Parameters.Count == 0;
            }
        }

        static bool IsSimpleQueryPath(string value) {
            string trimmed = value.Trim();
            if (trimmed.Length == 0) {
                return false;
            }

            string[] segments = trimmed.Split('.');
            for (int i = 0; i < segments.Length; i += 1) {
                string segment = segments[i];
                if (segment.Length == 0 || !IsIdentifierStart(segment[0])) {
                    return false;
                }

                for (int j = 1; j < segment.Length; j += 1) {
                    if (!IsIdentifierPart(segment[j])) {
                        return false;
                    }
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
