using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeFactsModel {

        public List<NarrativeRuntimeNodeVisitFactModel> VisitedNodes { get; set; }

        public List<string> SeenLineAnchors { get; set; }

        public List<NarrativeRuntimeChoiceFactModel> ChoiceHistory { get; set; }

        public NarrativeRuntimeFactsModel() {
            VisitedNodes = new List<NarrativeRuntimeNodeVisitFactModel>();
            SeenLineAnchors = new List<string>();
            ChoiceHistory = new List<NarrativeRuntimeChoiceFactModel>();
        }

    }

    public sealed class NarrativeRuntimeNodeVisitFactModel {

        public string NodeName { get; set; }

        public int Count { get; set; }

        public NarrativeRuntimeNodeVisitFactModel() {
            NodeName = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeChoiceFactModel {

        public string NodeName { get; set; }

        public int GroupIndex { get; set; }

        public int OptionIndex { get; set; }

        public string OptionAnchor { get; set; }

        public string TargetNodeName { get; set; }

        public NarrativeRuntimeChoiceFactModel() {
            NodeName = string.Empty;
            OptionAnchor = string.Empty;
            TargetNodeName = string.Empty;
        }

    }

}
