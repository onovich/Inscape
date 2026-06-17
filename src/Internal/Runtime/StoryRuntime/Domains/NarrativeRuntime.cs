using System.Collections.Generic;
using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntime {

        public const string CurrentRuntimeVersion = "p3-runtime-state-v1";

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
            State.Facts = new NarrativeRuntimeFactsModel();

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
            if (target.Length == 0 || !nodesByName.ContainsKey(target)) {
                return false;
            }

            DslScriptChoiceOptionModel option = group.Options[optionIndex];
            if (!EnterNode(target, false)) {
                return false;
            }

            State.Facts.ChoiceHistory.Add(new NarrativeRuntimeChoiceFactModel {
                NodeName = node.Name,
                GroupIndex = groupIndex,
                OptionIndex = optionIndex,
                OptionAnchor = option.Anchor,
                TargetNodeName = target,
            });
            return true;
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
            RecordSeenLine(node, State.VisibleStepCount);
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
            State.Facts = CloneFacts(state.Facts);
            return true;
        }

        public NarrativeRuntimeSnapshotModel CreateSnapshot() {
            return new NarrativeRuntimeSnapshotModel {
                ReadingProgress = SnapshotReadingProgress(),
                State = SnapshotState(),
                CurrentNode = CurrentNode,
            };
        }

        public NarrativeRuntimeExportStateModel ExportState(string scriptVersion = "", string hostCheckpointId = "") {
            NarrativeRuntimeExportStateModel state = new NarrativeRuntimeExportStateModel();
            state.RuntimeVersion = CurrentRuntimeVersion;
            state.ScriptVersion = scriptVersion;
            state.Position = SnapshotExportPosition();
            state.Flow.EntryNodeId = State.Path.Count > 0 ? State.Path[0] : State.CurrentNodeName;
            state.Flow.Stack.AddRange(State.Path);
            state.Facts = CloneFacts(State.Facts);
            state.Host.CheckpointId = hostCheckpointId;
            return state;
        }

        public NarrativeRuntimeStateValidationModel ValidateStateAgainstCurrentScript(NarrativeRuntimeExportStateModel state,
                                                                                      string currentScriptVersion = "") {
            NarrativeRuntimeStateValidationModel validation = new NarrativeRuntimeStateValidationModel {
                Status = NarrativeRuntimeStateValidationStatusModel.Compatible,
            };

            if (graph == null) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Incompatible,
                                        "IRT001",
                                        "error",
                                        "graph",
                                        "Runtime graph is not loaded.");
                return validation;
            }

            if (state.Format != "inscape.runtime-state") {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Incompatible,
                                        "IRT002",
                                        "error",
                                        "format",
                                        "Runtime state format is not supported: " + state.Format);
            }

            if (state.FormatVersion > 1) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Incompatible,
                                        "IRT003",
                                        "error",
                                        "formatVersion",
                                        "Runtime state format version is newer than this Runtime can read.");
            } else if (state.FormatVersion < 1) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Migratable,
                                        "IRT004",
                                        "warning",
                                        "formatVersion",
                                        "Runtime state uses an older format version and needs explicit migration.");
            }

            if (state.RuntimeVersion.Length > 0 && state.RuntimeVersion != CurrentRuntimeVersion) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Migratable,
                                        "IRT005",
                                        "warning",
                                        "runtimeVersion",
                                        "Runtime state was exported by a different Runtime version.");
            }

            if (currentScriptVersion.Length > 0
                && state.ScriptVersion.Length > 0
                && state.ScriptVersion != currentScriptVersion) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Migratable,
                                        "IRT006",
                                        "warning",
                                        "scriptVersion",
                                        "Runtime state script version differs from the current script version.");
            }

            if (state.Position.NodeId.Length == 0 || !nodesByName.ContainsKey(state.Position.NodeId)) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Incompatible,
                                        "IRT007",
                                        "error",
                                        "position.nodeId",
                                        "Runtime state current node does not exist in the current script.");
                return validation;
            }

            StoryGraphNodeModel node = nodesByName[state.Position.NodeId];
            int maxVisibleStepCount = GetMaxVisibleStepCount(node);
            if (state.Position.CommandIndex < 0) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Incompatible,
                                        "IRT008",
                                        "error",
                                        "position.commandIndex",
                                        "Runtime state command index cannot be negative.");
            } else if (state.Position.CommandIndex > maxVisibleStepCount) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Migratable,
                                        "IRT009",
                                        "warning",
                                        "position.commandIndex",
                                        "Runtime state command index is past the current node flow.");
                validation.SuggestedPosition.NodeId = state.Position.NodeId;
                validation.SuggestedPosition.CommandIndex = maxVisibleStepCount;
                validation.SuggestedPosition.LineId = GetVisibleLineAnchor(node, maxVisibleStepCount);
            }

            if (state.Position.LineId.Length > 0 && !ContainsLineAnchor(node, state.Position.LineId)) {
                AddValidationDiagnostic(validation,
                                        NarrativeRuntimeStateValidationStatusModel.Migratable,
                                        "IRT010",
                                        "warning",
                                        "position.lineId",
                                        "Runtime state line anchor is no longer present in the current node.");
                if (validation.SuggestedPosition.NodeId.Length == 0) {
                    validation.SuggestedPosition.NodeId = state.Position.NodeId;
                    validation.SuggestedPosition.CommandIndex = state.Position.CommandIndex <= maxVisibleStepCount
                        ? state.Position.CommandIndex
                        : maxVisibleStepCount;
                    validation.SuggestedPosition.LineId = GetVisibleLineAnchor(node, validation.SuggestedPosition.CommandIndex);
                }
            }

            if (validation.SuggestedPosition.NodeId.Length == 0) {
                validation.SuggestedPosition.NodeId = state.Position.NodeId;
                validation.SuggestedPosition.LineId = state.Position.LineId;
                validation.SuggestedPosition.CommandIndex = state.Position.CommandIndex;
            }

            return validation;
        }

        NarrativeRuntimeStateModel SnapshotState() {
            NarrativeRuntimeStateModel snapshot = new NarrativeRuntimeStateModel();
            snapshot.CurrentNodeName = State.CurrentNodeName;
            snapshot.Path.AddRange(State.Path);
            snapshot.VisibleStepCount = State.VisibleStepCount;
            snapshot.Facts = CloneFacts(State.Facts);
            return snapshot;
        }

        NarrativeRuntimeStatePositionModel SnapshotExportPosition() {
            StoryGraphNodeModel? node = CurrentNode;
            return new NarrativeRuntimeStatePositionModel {
                NodeId = State.CurrentNodeName,
                LineId = GetVisibleLineAnchor(node, State.VisibleStepCount),
                CommandIndex = State.VisibleStepCount,
            };
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
            RecordNodeVisit(nodeName);
            return true;
        }

        void RecordNodeVisit(string nodeName) {
            for (int i = 0; i < State.Facts.VisitedNodes.Count; i += 1) {
                if (State.Facts.VisitedNodes[i].NodeName == nodeName) {
                    State.Facts.VisitedNodes[i].Count += 1;
                    return;
                }
            }

            State.Facts.VisitedNodes.Add(new NarrativeRuntimeNodeVisitFactModel {
                NodeName = nodeName,
                Count = 1,
            });
        }

        void RecordSeenLine(StoryGraphNodeModel node, int visibleStepCount) {
            if (visibleStepCount <= 0) {
                return;
            }

            int contentIndex = 0;
            foreach (DslScriptLineModel line in node.Lines) {
                if (line.Kind == DslScriptLineKindModel.Metadata) {
                    continue;
                }

                contentIndex += 1;
                if (contentIndex == visibleStepCount) {
                    if (line.Anchor.Length > 0 && !State.Facts.SeenLineAnchors.Contains(line.Anchor)) {
                        State.Facts.SeenLineAnchors.Add(line.Anchor);
                    }
                    return;
                }
            }
        }

        static NarrativeRuntimeFactsModel CloneFacts(NarrativeRuntimeFactsModel facts) {
            NarrativeRuntimeFactsModel snapshot = new NarrativeRuntimeFactsModel();
            for (int i = 0; i < facts.VisitedNodes.Count; i += 1) {
                NarrativeRuntimeNodeVisitFactModel visit = facts.VisitedNodes[i];
                snapshot.VisitedNodes.Add(new NarrativeRuntimeNodeVisitFactModel {
                    NodeName = visit.NodeName,
                    Count = visit.Count,
                });
            }

            snapshot.SeenLineAnchors.AddRange(facts.SeenLineAnchors);

            for (int i = 0; i < facts.ChoiceHistory.Count; i += 1) {
                NarrativeRuntimeChoiceFactModel choice = facts.ChoiceHistory[i];
                snapshot.ChoiceHistory.Add(new NarrativeRuntimeChoiceFactModel {
                    NodeName = choice.NodeName,
                    GroupIndex = choice.GroupIndex,
                    OptionIndex = choice.OptionIndex,
                    OptionAnchor = choice.OptionAnchor,
                    TargetNodeName = choice.TargetNodeName,
                });
            }

            return snapshot;
        }

        static void AddValidationDiagnostic(NarrativeRuntimeStateValidationModel validation,
                                            NarrativeRuntimeStateValidationStatusModel status,
                                            string code,
                                            string severity,
                                            string path,
                                            string message) {
            if (validation.Status != NarrativeRuntimeStateValidationStatusModel.Incompatible) {
                validation.Status = status;
            }

            validation.Diagnostics.Add(new NarrativeRuntimeStateValidationDiagnosticModel {
                Code = code,
                Severity = severity,
                Path = path,
                Message = message,
            });
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

        static bool ContainsLineAnchor(StoryGraphNodeModel node, string lineAnchor) {
            foreach (DslScriptLineModel line in node.Lines) {
                if (line.Anchor == lineAnchor) {
                    return true;
                }
            }

            return false;
        }

        static string GetVisibleLineAnchor(StoryGraphNodeModel? node, int visibleStepCount) {
            if (node == null || visibleStepCount <= 0) {
                return string.Empty;
            }

            int contentIndex = 0;
            foreach (DslScriptLineModel line in node.Lines) {
                if (line.Kind == DslScriptLineKindModel.Metadata) {
                    continue;
                }

                contentIndex += 1;
                if (contentIndex == visibleStepCount) {
                    return line.Anchor;
                }
            }

            return string.Empty;
        }

    }

}
