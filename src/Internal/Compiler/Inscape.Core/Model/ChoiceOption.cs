namespace Inscape.Core.Model {

    public sealed class ChoiceOption {

        public string Text { get; set; }

        public string Target { get; set; }

        public string Anchor { get; set; }

        public SourceSpan Source { get; set; }

        public ChoiceOption() {
            Text = string.Empty;
            Target = string.Empty;
            Anchor = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}
