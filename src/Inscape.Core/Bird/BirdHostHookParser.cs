using System;

namespace Inscape.Core.Bird {

    public static class BirdHostHookParser {

        public static bool TryParseTimelineHook(string metadataText, out string alias) {
            alias = string.Empty;
            string trimmed = metadataText.Trim();

            if (trimmed.StartsWith("@timeline", StringComparison.Ordinal)) {
                alias = trimmed.Substring("@timeline".Length).Trim();
                if (alias.StartsWith(":", StringComparison.Ordinal)) {
                    alias = alias.Substring(1).Trim();
                }
                return alias.Length > 0;
            }

            if (!trimmed.StartsWith("[", StringComparison.Ordinal) || !trimmed.EndsWith("]", StringComparison.Ordinal)) {
                return false;
            }

            string body = trimmed.Substring(1, trimmed.Length - 2);
            int separator = body.IndexOf(':');
            if (separator < 0) {
                return false;
            }

            string key = body.Substring(0, separator).Trim();
            if (key != "timeline") {
                return false;
            }

            alias = body.Substring(separator + 1).Trim();
            return alias.Length > 0;
        }

    }

}
