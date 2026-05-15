using System.Collections.Generic;
using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntime {

        readonly Dictionary<string, StoryGraphNodeModel> nodesByName;
        DslScriptDocumentModel? graph;

        public NarrativeRuntimeStateModel State { get; }

        public StoryGraphNodeModel? CurrentNode {
            get {
                if (State.CurrentNodeName.Length == 0 || !nodesByName.ContainsKey(State.CurrentNodeName)) {
                    return null;
                }

                return nodesByName[State.CurrentNodeName];
            }
        }

        public NarrativeRuntime() {
            nodesByName = new Dictionary<string, StoryGraphNodeModel>();
            State = new NarrativeRuntimeStateModel();
        }

        public void LoadGraph(DslScriptDocumentModel narrativeGraph) {
            graph = narrativeGraph;
            nodesByName.Clear();
            State.CurrentNodeName = string.Empty;
            State.Path.Clear();

            foreach (StoryGraphNodeModel node in narrativeGraph.Nodes) {
                if (!nodesByName.ContainsKey(node.Name)) {
                    nodesByName.Add(node.Name, node);
                }
            }
        }

        public bool Start(string entryNodeName = "") {
            if (graph == null || graph.Nodes.Count == 0) {
                return false;
            }

            string nodeName = entryNodeName.Length > 0 ? entryNodeName : graph.Nodes[0].Name;
            return EnterNode(nodeName, true);
        }

        public bool Continue() {
            StoryGraphNodeModel? node = CurrentNode;
            if (node == null || node.DefaultNext.Length == 0) {
                return false;
            }

            return EnterNode(node.DefaultNext, false);
        }

        public bool Choose(int groupIndex, int optionIndex) {
            StoryGraphNodeModel? node = CurrentNode;
            if (node == null || groupIndex < 0 || groupIndex >= node.Choices.Count) {
                return false;
            }

            DslScriptChoiceGroupModel group = node.Choices[groupIndex];
            if (optionIndex < 0 || optionIndex >= group.Options.Count) {
                return false;
            }

            string target = group.Options[optionIndex].Target;
            return target.Length > 0 && EnterNode(target, false);
        }

        public bool Restore(NarrativeRuntimeStateModel state) {
            if (state.CurrentNodeName.Length > 0 && !nodesByName.ContainsKey(state.CurrentNodeName)) {
                return false;
            }

            State.CurrentNodeName = state.CurrentNodeName;
            State.Path.Clear();
            State.Path.AddRange(state.Path);
            return true;
        }

        NarrativeRuntimeStateModel Snapshot() {
            NarrativeRuntimeStateModel snapshot = new NarrativeRuntimeStateModel();
            snapshot.CurrentNodeName = State.CurrentNodeName;
            snapshot.Path.AddRange(State.Path);
            return snapshot;
        }

        bool EnterNode(string nodeName, bool resetPath) {
            if (!nodesByName.ContainsKey(nodeName)) {
                return false;
            }

            State.CurrentNodeName = nodeName;
            if (resetPath) {
                State.Path.Clear();
            }
            State.Path.Add(nodeName);
            return true;
        }

    }

}
