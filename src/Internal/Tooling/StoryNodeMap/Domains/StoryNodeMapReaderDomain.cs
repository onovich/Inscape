using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class StoryNodeMapReaderDomain {

        public static bool TryRead(string path,
                                   JsonSerializerOptions jsonOptions,
                                   out StoryNodeMapModel map,
                                   out string? errorMessage) {
            map = new StoryNodeMapModel();
            errorMessage = null;

            string fullPath = Path.GetFullPath(path);
            if (!File.Exists(fullPath)) {
                return true;
            }

            try {
                StoryNodeMapModel? parsed = JsonSerializer.Deserialize<StoryNodeMapModel>(File.ReadAllText(fullPath, Encoding.UTF8), jsonOptions);
                map = Normalize(parsed ?? new StoryNodeMapModel());
                if (map.Format != "inscape.node-map") {
                    errorMessage = "Invalid node map format in '" + fullPath + "': expected 'inscape.node-map'.";
                    return false;
                }

                if (map.FormatVersion != 1) {
                    errorMessage = "Unsupported node map formatVersion in '" + fullPath + "': " + map.FormatVersion + ".";
                    return false;
                }

                return true;
            } catch (Exception ex) {
                errorMessage = "Invalid node map '" + fullPath + "': " + ex.Message;
                return false;
            }
        }

        static StoryNodeMapModel Normalize(StoryNodeMapModel map) {
            map.Format = string.IsNullOrWhiteSpace(map.Format) ? "inscape.node-map" : map.Format;
            map.FormatVersion = map.FormatVersion == 0 ? 1 : map.FormatVersion;
            map.Nodes ??= new List<StoryNodeMapEntryModel>();
            map.Tombstones ??= new List<StoryNodeMapTombstoneModel>();

            for (int i = 0; i < map.Nodes.Count; i += 1) {
                StoryNodeMapEntryModel node = map.Nodes[i];
                node.Id ??= string.Empty;
                node.Title ??= string.Empty;
                node.PreviousTitles ??= new List<string>();
                node.SourcePath ??= string.Empty;
                node.FirstContentFingerprint ??= string.Empty;
                node.NeighborFingerprint ??= string.Empty;
                node.LineAnchorSamples ??= new List<string>();
                node.Status ??= string.Empty;
                node.CreatedAt ??= string.Empty;
                node.UpdatedAt ??= string.Empty;
            }

            for (int i = 0; i < map.Tombstones.Count; i += 1) {
                StoryNodeMapTombstoneModel tombstone = map.Tombstones[i];
                tombstone.Id ??= string.Empty;
                tombstone.LastTitle ??= string.Empty;
                tombstone.LastSourcePath ??= string.Empty;
                tombstone.DeletedAt ??= string.Empty;
            }

            return map;
        }

    }

}
