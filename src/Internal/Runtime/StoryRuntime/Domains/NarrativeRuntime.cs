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
            State.VisibleStepCount = 0;

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

        public bool AdvanceFlow() {
            StoryGraphNodeModel? node = CurrentNode;
            if (node == null) {
                return false;
            }

            int maxVisibleStepCount = GetMaxVisibleStepCount(node);
            if (State.VisibleStepCount >= maxVisibleStepCount) {
                return false;
            }

            State.VisibleStepCount += 1;
            return true;
        }

        public bool RewindFlow() {
            if (State.VisibleStepCount <= 0) {
                return false;
            }

            State.VisibleStepCount -= 1;
            return true;
        }

        public bool Rewind() {
            if (State.Path.Count <= 1) {
                return false;
            }

            string previousNodeName = State.Path[State.Path.Count - 2];
            if (!nodesByName.ContainsKey(previousNodeName)) {
                return false;
            }

            State.Path.RemoveAt(State.Path.Count - 1);
            State.CurrentNodeName = previousNodeName;
            State.VisibleStepCount = GetMaxVisibleStepCount(nodesByName[previousNodeName]);
            return true;
        }

        public bool Restore(NarrativeRuntimeStateModel state) {
            if (state.CurrentNodeName.Length > 0 && !nodesByName.ContainsKey(state.CurrentNodeName)) {
                return false;
            }

            StoryGraphNodeModel? restoredNode = state.CurrentNodeName.Length > 0
                ? nodesByName[state.CurrentNodeName]
                : null;
            if (state.VisibleStepCount < 0 || (restoredNode != null && state.VisibleStepCount > GetMaxVisibleStepCount(restoredNode))) {
                return false;
            }

            State.CurrentNodeName = state.CurrentNodeName;
            State.Path.Clear();
            State.Path.AddRange(state.Path);
            State.VisibleStepCount = state.VisibleStepCount;
            return true;
        }

        public NarrativeRuntimeSnapshotModel CreateSnapshot() {
            return new NarrativeRuntimeSnapshotModel {
                ReadingProgress = SnapshotReadingProgress(),
                State = SnapshotState(),
                CurrentNode = CurrentNode,
            };
        }

        NarrativeRuntimeStateModel SnapshotState() {
            NarrativeRuntimeStateModel snapshot = new NarrativeRuntimeStateModel();
            snapshot.CurrentNodeName = State.CurrentNodeName;
            snapshot.Path.AddRange(State.Path);
            snapshot.VisibleStepCount = State.VisibleStepCount;
            return snapshot;
        }

        NarrativeRuntimeReadingProgressModel SnapshotReadingProgress() {
            StoryGraphNodeModel? node = CurrentNode;
            int contentStepCount = GetContentStepCount(node);
            int maxVisibleStepCount = GetMaxVisibleStepCount(node);
            return new NarrativeRuntimeReadingProgressModel {
                ContentStepCount = contentStepCount,
                MaxVisibleStepCount = maxVisibleStepCount,
                VisibleStepCount = State.VisibleStepCount,
                CanAdvance = State.VisibleStepCount < maxVisibleStepCount,
                CanRewind = State.VisibleStepCount > 0,
                IsChoiceStageVisible = node != null && node.Choices.Count > 0 && State.VisibleStepCount > contentStepCount,
                IsContinueStageVisible = node != null && node.DefaultNext.Length > 0 && State.VisibleStepCount > contentStepCount,
            };
        }

        bool EnterNode(string nodeName, bool resetPath) {
            if (!nodesByName.ContainsKey(nodeName)) {
                return false;
            }

            State.CurrentNodeName = nodeName;
            State.VisibleStepCount = 0;
            if (resetPath) {
                State.Path.Clear();
            }
            State.Path.Add(nodeName);
            return true;
        }

        static int GetContentStepCount(StoryGraphNodeModel? node) {
            if (node == null) {
                return 0;
            }

            int contentStepCount = 0;
            foreach (DslScriptLineModel line in node.Lines) {
                if (line.Kind != DslScriptLineKindModel.Metadata) {
                    contentStepCount += 1;
                }
            }

            return contentStepCount;
        }

        static int GetMaxVisibleStepCount(StoryGraphNodeModel? node) {
            if (node == null) {
                return 0;
            }

            int contentStepCount = GetContentStepCount(node);
            bool hasTerminalChoiceStage = node.Choices.Count > 0 || node.DefaultNext.Length > 0;
            return contentStepCount + (hasTerminalChoiceStage ? 1 : 0);
        }

    }

}
