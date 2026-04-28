namespace Inscape.Core.Parsing {

    public static class NodeNameRules {

        public const string Description = "Node names must start with a lowercase letter and may contain lowercase letters, digits, '_', '-', and '.'; dots separate non-empty segments.";

        public static bool IsValid(string name) {
            if (string.IsNullOrEmpty(name)) {
                return false;
            }

            if (!IsLowerAsciiLetter(name[0])) {
                return false;
            }

            char previous = '\0';
            for (int i = 0; i < name.Length; i += 1) {
                char current = name[i];
                if (!IsAllowed(current)) {
                    return false;
                }
                if (current == '.' && (previous == '.' || previous == '\0')) {
                    return false;
                }
                previous = current;
            }

            char last = name[name.Length - 1];
            return IsLowerAsciiLetter(last) || IsDigit(last);
        }

        static bool IsAllowed(char value) {
            return IsLowerAsciiLetter(value)
                || IsDigit(value)
                || value == '_'
                || value == '-'
                || value == '.';
        }

        static bool IsLowerAsciiLetter(char value) {
            return value >= 'a' && value <= 'z';
        }

        static bool IsDigit(char value) {
            return value >= '0' && value <= '9';
        }

    }

}
