namespace Inscape.Core.Model {

    public sealed class NodeEdge {

        public string From { get; set; }

        public string To { get; set; }

        public NodeEdgeKind Kind { get; set; }

        public string Label { get; set; }

        public SourceSpan Source { get; set; }

        public NodeEdge() {
            From = string.Empty;
            To = string.Empty;
            Label = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}
