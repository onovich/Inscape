using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class PreviewStyleReaderDomain {

        public static PreviewStyleSheetModel Read(string? stylePath, JsonSerializerOptions jsonOptions, out string? errorMessage) {
            errorMessage = null;
            if (string.IsNullOrWhiteSpace(stylePath) || !File.Exists(stylePath)) {
                return new PreviewStyleSheetModel();
            }

            try {
                PreviewStyleSheetModel? parsed = JsonSerializer.Deserialize<PreviewStyleSheetModel>(File.ReadAllText(stylePath, Encoding.UTF8), jsonOptions);
                return parsed ?? new PreviewStyleSheetModel();
            } catch (Exception ex) {
                errorMessage = "Invalid preview style '" + stylePath + "': " + ex.Message;
                return new PreviewStyleSheetModel();
            }
        }

    }

}