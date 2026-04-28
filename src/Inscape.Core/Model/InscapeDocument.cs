using System.Collections.Generic;

namespace Inscape.Core.Model {

    public sealed class InscapeDocument {

        public string SourcePath { get; set; }

        public List<NarrativeNode> Nodes { get; set; }

        public List<NodeEdge> Edges { get; set; }

        public InscapeDocument() {
            SourcePath = string.Empty;
            Nodes = new List<NarrativeNode>();
            Edges = new List<NodeEdge>();
        }

    }

}
