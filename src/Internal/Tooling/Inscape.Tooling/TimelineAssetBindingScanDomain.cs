using System.Text;

namespace Inscape.Tooling {

    public static class TimelineAssetBindingScanDomain {

        public static bool TryRead(string? timelineRoot,
                                   out Dictionary<string, TimelineAssetBindingModel> bindingsByAlias,
                                   out string? errorMessage) {
            bindingsByAlias = new Dictionary<string, TimelineAssetBindingModel>(StringComparer.Ordinal);
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(timelineRoot)) {
                return true;
            }

            if (!Directory.Exists(timelineRoot)) {
                errorMessage = "Existing timeline root not found: " + timelineRoot;
                return false;
            }

            HashSet<string> ambiguousAliases = new HashSet<string>(StringComparer.Ordinal);
            foreach (string assetPath in Directory.EnumerateFiles(timelineRoot, "*.asset", SearchOption.AllDirectories)) {
                if (!TryReadTimelineId(assetPath, out int timelineId)) {
                    continue;
                }

                TimelineAssetBindingModel binding = new TimelineAssetBindingModel {
                    TimelineId = timelineId,
                    UnityGuid = ReadUnityMetaGuid(assetPath + ".meta"),
                    AssetPath = ToUnityAssetPath(assetPath),
                };

                foreach (string candidate in CreateAliasCandidates(assetPath)) {
                    if (ambiguousAliases.Contains(candidate)) {
                        continue;
                    }

                    if (bindingsByAlias.ContainsKey(candidate)) {
                        bindingsByAlias.Remove(candidate);
                        ambiguousAliases.Add(candidate);
                    } else {
                        bindingsByAlias.Add(candidate, binding);
                    }
                }
            }

            return true;
        }

        static bool TryReadTimelineId(string assetPath, out int timelineId) {
            timelineId = 0;
            foreach (string rawLine in File.ReadLines(assetPath, Encoding.UTF8)) {
                string line = rawLine.Trim();
                if (!line.StartsWith("timelineId:", StringComparison.Ordinal)) {
                    continue;
                }

                string value = line.Substring("timelineId:".Length).Trim();
                return int.TryParse(value, out timelineId);
            }

            return false;
        }

        static string ReadUnityMetaGuid(string metaPath) {
            if (!File.Exists(metaPath)) {
                return string.Empty;
            }

            foreach (string rawLine in File.ReadLines(metaPath, Encoding.UTF8)) {
                string line = rawLine.Trim();
                if (line.StartsWith("guid:", StringComparison.Ordinal)) {
                    return line.Substring("guid:".Length).Trim();
                }
            }

            return string.Empty;
        }

        static string ToUnityAssetPath(string assetPath) {
            string normalized = Path.GetFullPath(assetPath).Replace('\\', '/');
            int marker = normalized.IndexOf("/Assets/", StringComparison.OrdinalIgnoreCase);
            if (marker >= 0) {
                return normalized.Substring(marker + 1);
            }

            if (normalized.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase)) {
                return normalized;
            }

            return normalized;
        }

        static SortedSet<string> CreateAliasCandidates(string assetPath) {
            SortedSet<string> candidates = new SortedSet<string>(StringComparer.Ordinal);
            string name = Path.GetFileNameWithoutExtension(assetPath);
            AddAliasCandidate(candidates, name);

            const string prefix = "SO_Timeline_";
            if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) {
                AddAliasCandidate(candidates, name.Substring(prefix.Length));
            }

            return candidates;
        }

        static void AddAliasCandidate(SortedSet<string> candidates, string value) {
            if (string.IsNullOrWhiteSpace(value)) {
                return;
            }

            candidates.Add(value);
            candidates.Add(value.ToLowerInvariant());
            string dotted = value.Replace('_', '.').Replace('-', '.');
            candidates.Add(dotted);
            candidates.Add(dotted.ToLowerInvariant());
        }

    }

}