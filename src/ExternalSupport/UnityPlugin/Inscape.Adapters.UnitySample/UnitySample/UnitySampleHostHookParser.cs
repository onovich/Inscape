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

            return trimmed.StartsWith("@", StringComparison.Ordinal)
                && TryParseAtTimelineHook(trimmed, out alias, out phase);
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

