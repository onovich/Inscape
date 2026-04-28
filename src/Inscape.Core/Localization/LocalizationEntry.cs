using Inscape.Core.Model;

namespace Inscape.Core.Localization {

    public sealed class LocalizationEntry {

        public string Anchor { get; set; }

        public string NodeName { get; set; }

        public string Kind { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public SourceSpan Source { get; set; }

        public LocalizationEntry() {
            Anchor = string.Empty;
            NodeName = string.Empty;
            Kind = string.Empty;
            Speaker = string.Empty;
            Text = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}
