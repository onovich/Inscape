using System.Text;

namespace Inscape.Core.Text {

    public static class StableHash {

        public const string AnchorVersion = "line-v1";

        const ulong OffsetBasis = 14695981039346656037UL;
        const ulong Prime = 1099511628211UL;

        public static string ForContent(string nodeName,
                                        string kind,
                                        string speaker,
                                        string text,
                                        int occurrence) {
            string input = "inscape-" + AnchorVersion + "\n"
                         + "kind=" + NormalizeAtom(kind) + "\n"
                         + "node=" + NormalizeAtom(nodeName) + "\n"
                         + "speaker=" + NormalizeAtom(speaker) + "\n"
                         + "occurrence=" + occurrence.ToString(System.Globalization.CultureInfo.InvariantCulture) + "\n"
                         + "text=" + NormalizeText(text);
            return "l1_" + ComputeHex(input);
        }

        public static string ForOccurrenceKey(string kind, string speaker, string text) {
            return NormalizeAtom(kind) + "\n"
                 + NormalizeAtom(speaker) + "\n"
                 + NormalizeText(text);
        }

        public static string ForLine(string sourcePath, string nodeName, int line, string text) {
            return ForContent(nodeName, "Line", string.Empty, text, 0);
        }

        public static string ComputeHex(string input) {
            byte[] bytes = Encoding.UTF8.GetBytes(NormalizeLineEndings(input).Normalize(NormalizationForm.FormC));
            ulong hash = OffsetBasis;
            for (int i = 0; i < bytes.Length; i += 1) {
                hash ^= bytes[i];
                hash *= Prime;
            }
            return hash.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
        }

        static string NormalizeAtom(string value) {
            return CollapseWhitespace(NormalizeLineEndings(value).Trim()).Normalize(NormalizationForm.FormC);
        }

        static string NormalizeText(string value) {
            return CollapseWhitespace(NormalizeLineEndings(value).Trim()).Normalize(NormalizationForm.FormC);
        }

        static string NormalizeLineEndings(string value) {
            return value.Replace("\r\n", "\n").Replace('\r', '\n');
        }

        static string CollapseWhitespace(string value) {
            StringBuilder builder = new StringBuilder();
            bool pendingSpace = false;

            for (int i = 0; i < value.Length; i += 1) {
                char c = value[i];
                if (char.IsWhiteSpace(c)) {
                    pendingSpace = builder.Length > 0;
                    continue;
                }

                if (pendingSpace) {
                    builder.Append(' ');
                    pendingSpace = false;
                }
                builder.Append(c);
            }

            return builder.ToString();
        }

    }

}
