using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class StoryNodeMapWriterDomain {

        public static void Write(string path, StoryNodeMapModel map, JsonSerializerOptions jsonOptions) {
            string fullPath = Path.GetFullPath(path);
            string? directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrWhiteSpace(directory)) {
                Directory.CreateDirectory(directory);
            }

            string content = JsonSerializer.Serialize(map, jsonOptions);
            File.WriteAllText(fullPath, content, Encoding.UTF8);
        }

    }

}
