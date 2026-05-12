namespace Inscape.Core.Model {

    public sealed class NarrativeLine {

        public NarrativeLineKind Kind { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public string Raw { get; set; }

        public string Anchor { get; set; }

        public SourceSpan Source { get; set; }

        public NarrativeLine() {
            Speaker = string.Empty;
            Text = string.Empty;
            Raw = string.Empty;
            Anchor = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}
