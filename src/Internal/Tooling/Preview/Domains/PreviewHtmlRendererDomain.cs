using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class PreviewHtmlRendererDomain {

        public static string Render(object viewModel, JsonSerializerOptions jsonOptions) {
            return Render(viewModel, jsonOptions, new PreviewStyleSheetModel());
        }

        public static string Render(object viewModel, JsonSerializerOptions jsonOptions, PreviewStyleSheetModel? styleSheet) {
            return RenderSerializedOutput(viewModel, jsonOptions, styleSheet);
        }

        static string RenderSerializedOutput(object viewModel, JsonSerializerOptions jsonOptions, PreviewStyleSheetModel? styleSheet) {
            string json = JsonSerializer.Serialize(viewModel, jsonOptions).Replace("</", "<\\/");
            PreviewStyleSheetModel style = styleSheet ?? new PreviewStyleSheetModel();

            string template = ReadPreviewResource("preview-template.html");
            string css = ReadPreviewResource("preview.css");
            string script = ReadPreviewResource("preview.js");

            return template
                .Replace("{{INSCP_STYLE_VARIABLES}}", BuildStyleVariables(style))
                .Replace("{{INSCP_PREVIEW_CSS}}", css)
                .Replace("{{INSCP_PREVIEW_DATA}}", json)
                .Replace("{{INSCP_PREVIEW_JS}}", script);
        }

        static string BuildStyleVariables(PreviewStyleSheetModel style) {
            StringBuilder builder = new StringBuilder();
            builder.Append(":root { color-scheme: light dark;");
            builder.Append(" --inscape-font-family: ").Append(Css(style.FontFamily)).Append(';');
            builder.Append(" --inscape-page-background: ").Append(Css(style.PageBackground)).Append(';');
            builder.Append(" --inscape-text-color: ").Append(Css(style.TextColor)).Append(';');
            builder.Append(" --inscape-card-background: ").Append(Css(style.CardBackground)).Append(';');
            builder.Append(" --inscape-node-title-color: ").Append(Css(style.NodeTitleColor)).Append(';');
            builder.Append(" --inscape-muted-text-color: ").Append(Css(style.MutedTextColor)).Append(';');
            builder.Append(" --inscape-toolbar-button-background: ").Append(Css(style.ToolbarButtonBackground)).Append(';');
            builder.Append(" --inscape-toolbar-button-hover-background: ").Append(Css(style.ToolbarButtonHoverBackground)).Append(';');
            builder.Append(" --inscape-source-button-background: ").Append(Css(style.SourceButtonBackground)).Append(';');
            builder.Append(" --inscape-source-button-hover-background: ").Append(Css(style.SourceButtonHoverBackground)).Append(';');
            builder.Append(" --inscape-meta-background: ").Append(Css(style.MetaBackground)).Append(';');
            builder.Append(" --inscape-meta-text-color: ").Append(Css(style.MetaTextColor)).Append(';');
            builder.Append(" --inscape-speaker-color: ").Append(Css(style.SpeakerColor)).Append(';');
            builder.Append(" --inscape-choice-background: ").Append(Css(style.ChoiceBackground)).Append(';');
            builder.Append(" --inscape-choice-prompt-color: ").Append(Css(style.ChoicePromptColor)).Append(';');
            builder.Append(" --inscape-query-interpolation-background: ").Append(Css(style.QueryInterpolationBackground)).Append(';');
            builder.Append(" --inscape-query-interpolation-text-color: ").Append(Css(style.QueryInterpolationTextColor)).Append(';');
            builder.Append(" --inscape-diagnostic-background: ").Append(Css(style.DiagnosticModelBackground)).Append(';');
            builder.Append(" --inscape-diagnostic-text-color: ").Append(Css(style.DiagnosticModelTextColor)).Append(';');
            builder.Append(" --inscape-story-font-size: ").Append(Css(style.StoryFontSize)).Append(';');
            builder.Append(" --inscape-story-line-height: ").Append(Css(style.StoryLineHeight)).Append(';');
            builder.Append(" --inscape-card-radius: ").Append(Css(style.CardRadius)).Append(';');
            builder.Append(" --inscape-choice-radius: ").Append(Css(style.ChoiceRadius)).Append("; }");
            return builder.ToString();
        }

        static string ReadPreviewResource(string fileName) {
            foreach (string path in CandidatePreviewResourcePaths(fileName)) {
                if (File.Exists(path)) {
                    return File.ReadAllText(path, Encoding.UTF8);
                }
            }

            throw new FileNotFoundException("Preview resource file was not found.", fileName);
        }

        static IEnumerable<string> CandidatePreviewResourcePaths(string fileName) {
            string relativePath = Path.Combine("Resources", "Preview", fileName);

            yield return Path.Combine(AppContext.BaseDirectory, relativePath);
            yield return Path.Combine(Directory.GetCurrentDirectory(), "src", "Internal", "Tooling", relativePath);

            DirectoryInfo? directory = new DirectoryInfo(AppContext.BaseDirectory);
            while (directory != null) {
                yield return Path.Combine(directory.FullName, "src", "Internal", "Tooling", relativePath);
                yield return Path.Combine(directory.FullName, relativePath);
                directory = directory.Parent;
            }
        }

        static string Css(string? value) {
            return string.IsNullOrWhiteSpace(value)
                ? "initial"
                : value.Replace("</", "<\\/").Replace("\r", " ").Replace("\n", " ").Trim();
        }

    }

}
