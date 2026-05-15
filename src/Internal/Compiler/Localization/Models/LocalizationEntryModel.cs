using Inscape.Compiler.Model;

namespace Inscape.Compiler.Localization {

    public sealed class LocalizationEntryModel {

        public string Anchor { get; set; }

        public string NodeName { get; set; }

        public string Kind { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public string Translation { get; set; }

        public string Status { get; set; }

        public SourceSpanModel Source { get; set; }

        public LocalizationEntryModel() {
            Anchor = string.Empty;
            NodeName = string.Empty;
            Kind = string.Empty;
            Speaker = string.Empty;
            Text = string.Empty;
            Translation = string.Empty;
            Status = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
