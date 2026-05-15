using System.Collections.Generic;

namespace Inscape.Compiler.Model {

    public sealed class DslScriptDocumentModel {

        public string SourcePath { get; set; }

        public List<StoryGraphNodeModel> Nodes { get; set; }

        public List<StoryGraphEdgeModel> Edges { get; set; }

        public DslScriptDocumentModel() {
            SourcePath = string.Empty;
            Nodes = new List<StoryGraphNodeModel>();
            Edges = new List<StoryGraphEdgeModel>();
        }

    }

}
