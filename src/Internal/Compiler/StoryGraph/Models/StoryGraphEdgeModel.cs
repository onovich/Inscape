namespace Inscape.Compiler.Model {

    public sealed class StoryGraphEdgeModel {

        public string From { get; set; }

        public string To { get; set; }

        public StoryGraphEdgeKindModel Kind { get; set; }

        public string Label { get; set; }

        public SourceSpanModel Source { get; set; }

        public StoryGraphEdgeModel() {
            From = string.Empty;
            To = string.Empty;
            Label = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
