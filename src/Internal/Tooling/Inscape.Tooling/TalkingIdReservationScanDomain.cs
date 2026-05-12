using System.Text;

namespace Inscape.Tooling {

    public static class TalkingIdReservationScanDomain {

        public static bool TryRead(string? talkingRoot,
                                   out HashSet<int> reservedTalkingIds,
                                   out string? errorMessage) {
            reservedTalkingIds = new HashSet<int>();
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(talkingRoot)) {
                return true;
            }

            if (!Directory.Exists(talkingRoot)) {
                errorMessage = "Existing talking root not found: " + talkingRoot;
                return false;
            }

            foreach (string assetPath in Directory.EnumerateFiles(talkingRoot, "*.asset", SearchOption.AllDirectories)) {
                string[] lines = File.ReadAllLines(assetPath, Encoding.UTF8);
                for (int i = 0; i < lines.Length; i += 1) {
                    string line = lines[i].Trim();
                    if (!line.StartsWith("talkingId:", StringComparison.Ordinal)) {
                        continue;
                    }

                    string value = line.Substring("talkingId:".Length).Trim();
                    if (int.TryParse(value, out int talkingId)) {
                        reservedTalkingIds.Add(talkingId);
                    }

                    break;
                }
            }

            return true;
        }

    }

}