namespace Inscape.Compiler.Parsing {

    public static class DslScriptNodeTitleValidatorDomain {

        public const string Description = "Node titles must be non-empty text and cannot contain '/', '\\', control characters, or the token '->'.";

        public static bool IsValid(string title) {
            if (string.IsNullOrWhiteSpace(title)) {
                return false;
            }
            if (title.Contains("->")) {
                return false;
            }
            for (int i = 0; i < title.Length; i += 1) {
                char value = title[i];
                if (char.IsControl(value)) {
                    return false;
                }
                if (value == '/' || value == '\\') {
                    return false;
                }
            }
            return true;
        }

    }

}
