using System.Text;
using System.Text.Json;

namespace Inscape.Cli {

    static class CliPreviewStyleLoader {

        public static CliPreviewStyleSheet Read(string? stylePath, JsonSerializerOptions jsonOptions) {
            if (string.IsNullOrWhiteSpace(stylePath) || !File.Exists(stylePath)) {
                return new CliPreviewStyleSheet();
            }

            try {
                CliPreviewStyleSheet? parsed = JsonSerializer.Deserialize<CliPreviewStyleSheet>(File.ReadAllText(stylePath, Encoding.UTF8), jsonOptions);
                return parsed ?? new CliPreviewStyleSheet();
            } catch (Exception ex) {
                Console.Error.WriteLine("Invalid preview style '" + stylePath + "': " + ex.Message);
                return new CliPreviewStyleSheet();
            }
        }

    }

}