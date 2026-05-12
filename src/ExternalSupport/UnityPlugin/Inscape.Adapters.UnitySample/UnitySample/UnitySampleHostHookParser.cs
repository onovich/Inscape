using System;

namespace Inscape.Adapters.UnitySample {

    public static class UnitySampleHostHookParser {

        public const string DefaultTimelinePhase = "talking.exit";

        public static bool TryParseTimelineHook(string metadataText, out string alias) {
            return TryParseTimelineHook(metadataText, out alias, out _);
        }

        public static bool TryParseTimelineHook(string metadataText, out string alias, out string phase) {
            alias = string.Empty;
            phase = DefaultTimelinePhase;
            string trimmed = metadataText.Trim();

            if (trimmed.StartsWith("@", StringComparison.Ordinal)) {
                return TryParseAtTimelineHook(trimmed, out alias, out phase);
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
            if (!TryParseTimelineKey(key, out phase)) {
                return false;
            }

            alias = body.Substring(separator + 1).Trim();
            return alias.Length > 0;
        }

        static bool TryParseAtTimelineHook(string trimmed, out string alias, out string phase) {
            alias = string.Empty;
            phase = DefaultTimelinePhase;

            int keyStart = 1;
            int keyEnd = keyStart;
            while (keyEnd < trimmed.Length && !char.IsWhiteSpace(trimmed[keyEnd]) && trimmed[keyEnd] != ':') {
                keyEnd += 1;
            }

            string key = trimmed.Substring(keyStart, keyEnd - keyStart);
            if (!TryParseTimelineKey(key, out phase)) {
                return false;
            }

            string rest = trimmed.Substring(keyEnd).Trim();
            if (rest.StartsWith(":", StringComparison.Ordinal)) {
                rest = rest.Substring(1).Trim();
            }

            alias = rest;
            return alias.Length > 0;
        }

        static bool TryParseTimelineKey(string key, out string phase) {
            phase = DefaultTimelinePhase;
            if (key == "timeline") {
                return true;
            }

            const string prefix = "timeline.";
            if (!key.StartsWith(prefix, StringComparison.Ordinal)) {
                return false;
            }

            string candidate = key.Substring(prefix.Length);
            if (!IsSupportedTimelinePhase(candidate)) {
                return false;
            }

            phase = candidate;
            return true;
        }

        public static bool IsSupportedTimelinePhase(string phase) {
            return phase == "talking.enter"
                || phase == "talking.exit"
                || phase == "node.enter"
                || phase == "node.exit";
        }

    }

}

