using System.Text;

namespace Inscape.Core.Text {

    public static class StableHash {

        const ulong OffsetBasis = 14695981039346656037UL;
        const ulong Prime = 1099511628211UL;

        public static string ForLine(string sourcePath, string nodeName, int line, string text) {
            string input = "inscape-line-v1\n"
                         + Normalize(sourcePath) + "\n"
                         + Normalize(nodeName) + "\n"
                         + line.ToString(System.Globalization.CultureInfo.InvariantCulture) + "\n"
                         + Normalize(text);
            return ComputeHex(input);
        }

        public static string ComputeHex(string input) {
            byte[] bytes = Encoding.UTF8.GetBytes(Normalize(input));
            ulong hash = OffsetBasis;
            for (int i = 0; i < bytes.Length; i += 1) {
                hash ^= bytes[i];
                hash *= Prime;
            }
            return hash.ToString("x16", System.Globalization.CultureInfo.InvariantCulture);
        }

        static string Normalize(string value) {
            return value.Replace("\r\n", "\n").Replace('\r', '\n').TrimEnd();
        }

    }

}
