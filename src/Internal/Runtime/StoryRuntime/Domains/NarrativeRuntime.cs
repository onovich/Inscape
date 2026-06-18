using System;
using System.Collections.Generic;
using System.Globalization;
using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntime {

        public const string CurrentRuntimeVersion = "p3-runtime-state-v1";

        readonly Dictionary<string, StoryGraphNodeModel> nodesByName;
        readonly HashSet<string> dispatchedActionKeys;
        DslScriptDocumentModel? graph;

        public NarrativeRuntimeStateModel State { get; }

        public NarrativeRuntimeQueryProviderModel QueryProvider { get; set; }

        public NarrativeRuntimeActionDispatcherModel ActionDispatcher { get; set; }

        public NarrativeRuntimeFlowErrorModel? LastError { get; private set; }

        public List<NarrativeRuntimeQueryReceiptModel> BranchQueryReceipts { get; }

        public List<NarrativeRuntimeActionRequestModel> ActionRequests { get; }

        public NarrativeRuntimePendingActionModel? PendingAction { get; private set; }

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
            dispatchedActionKeys = new HashSet<string>(StringComparer.Ordinal);
            State = new NarrativeRuntimeStateModel();
            QueryProvider = new NarrativeRuntimeQueryProviderModel();
            ActionDispatcher = new NarrativeRuntimeActionDispatcherModel();
            BranchQueryReceipts = new List<NarrativeRuntimeQueryReceiptModel>();
            ActionRequests = new List<NarrativeRuntimeActionRequestModel>();
        }

        public void LoadGraph(DslScriptDocumentModel narrativeGraph) {
            ClearLastError();
            BranchQueryReceipts.Clear();
            ActionRequests.Clear();
            dispatchedActionKeys.Clear();
            PendingAction = null;
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
            ClearLastError();
            BranchQueryReceipts.Clear();
            ActionRequests.Clear();
            dispatchedActionKeys.Clear();
            PendingAction = null;
            if (graph == null || graph.Nodes.Count == 0) {
                return SetFlowError("IRF001", "graph", "Runtime graph is not loaded.");
            }

            string nodeName = entryNodeName.Length > 0 ? entryNodeName : graph.Nodes[0].Name;
            return EnterNode(nodeName, true);
        }

        public bool Continue() {
            ClearLastError();
            if (HasPendingAction()) {
                return SetPendingActionError();
            }

            StoryGraphNodeModel? node = CurrentNode;
            if (node == null) {
                return SetFlowError("IRF001", "currentNode", "Runtime current node is missing.");
            }

            if (!TryResolveContinueTarget(node, out string target)) {
                return false;
            }

            return EnterNode(target, false);
        }

        public bool Choose(int groupIndex, int optionIndex) {
            ClearLastError();
            if (HasPendingAction()) {
                return SetPendingActionError();
            }

            StoryGraphNodeModel? node = CurrentNode;
            if (node == null || groupIndex < 0 || groupIndex >= node.Choices.Count) {
                return SetFlowError("IRF002", "choice.groupIndex", "Runtime choice group is not available.");
            }

            if (!TryResolveVisibleChoice(node,
                                         groupIndex,
                                         optionIndex,
                                         out DslScriptChoiceOptionModel option,
                                         out int originalOptionIndex)) {
                return false;
            }

            string target = option.Target;
            if (target.Length == 0 || !nodesByName.ContainsKey(target)) {
                return SetFlowError("IRF004", "choice.target", "Runtime choice target is not available: " + target);
            }

            if (!EnterNode(target, false)) {
                return false;
            }

            State.Facts.ChoiceHistory.Add(new NarrativeRuntimeChoiceFactModel {
                NodeName = node.Name,
                GroupIndex = groupIndex,
                OptionIndex = originalOptionIndex,
                OptionAnchor = option.Anchor,
                TargetNodeName = target,
            });
            return true;
        }

        public bool AdvanceFlow() {
            ClearLastError();
            if (HasPendingAction()) {
                return SetPendingActionError();
            }

            StoryGraphNodeModel? node = CurrentNode;
            if (node == null) {
                return SetFlowError("IRF001", "currentNode", "Runtime current node is missing.");
            }

            int maxVisibleStepCount = GetMaxVisibleStepCount(node);
            if (State.VisibleStepCount >= maxVisibleStepCount) {
                return SetFlowError("IRF007", "visibleStepCount", "Runtime cannot advance flow from the current step.");
            }

            State.VisibleStepCount += 1;
            RecordSeenLine(node, State.VisibleStepCount);
            return DispatchAvailableActions(node);
        }

        public bool RewindFlow() {
            ClearLastError();
            if (HasPendingAction()) {
                return SetPendingActionError();
            }

            if (State.VisibleStepCount <= 0) {
                return SetFlowError("IRF008", "visibleStepCount", "Runtime cannot rewind flow from the current step.");
            }

            State.VisibleStepCount -= 1;
            return true;
        }

        public bool Rewind() {
            ClearLastError();
            if (HasPendingAction()) {
                return SetPendingActionError();
            }

            if (State.Path.Count <= 1) {
                return SetFlowError("IRF009", "path", "Runtime cannot rewind without a previous node.");
            }

            string previousNodeName = State.Path[State.Path.Count - 2];
            if (!nodesByName.ContainsKey(previousNodeName)) {
                return SetFlowError("IRF004", "path.previousNode", "Runtime previous node is not available: " + previousNodeName);
            }

            State.Path.RemoveAt(State.Path.Count - 1);
            State.CurrentNodeName = previousNodeName;
            State.VisibleStepCount = GetMaxVisibleStepCount(nodesByName[previousNodeName]);
            return true;
        }

        public bool Restore(NarrativeRuntimeStateModel state) {
            ClearLastError();
            BranchQueryReceipts.Clear();
            ActionRequests.Clear();
            dispatchedActionKeys.Clear();
            PendingAction = null;
            if (state.CurrentNodeName.Length > 0 && !nodesByName.ContainsKey(state.CurrentNodeName)) {
                return SetFlowError("IRF004", "state.currentNodeName", "Runtime restore node is not available: " + state.CurrentNodeName);
            }

            StoryGraphNodeModel? restoredNode = state.CurrentNodeName.Length > 0
                ? nodesByName[state.CurrentNodeName]
                : null;
            if (state.VisibleStepCount < 0 || (restoredNode != null && state.VisibleStepCount > GetMaxVisibleStepCount(restoredNode))) {
                return SetFlowError("IRF007", "state.visibleStepCount", "Runtime restore visible step count is out of range.");
            }

            State.CurrentNodeName = state.CurrentNodeName;
            State.Path.Clear();
            State.Path.AddRange(state.Path);
            State.VisibleStepCount = state.VisibleStepCount;
            State.Facts = CloneFacts(state.Facts);
            return true;
        }

        public NarrativeRuntimeSnapshotModel CreateSnapshot() {
            StoryGraphNodeModel? currentNode = CurrentNode;
            StoryGraphNodeModel? visibleNode = SnapshotVisibleNode(currentNode);
            return new NarrativeRuntimeSnapshotModel {
                ReadingProgress = SnapshotReadingProgress(currentNode, visibleNode),
                State = SnapshotState(),
                CurrentNode = visibleNode,
                LastError = CloneLastError(LastError),
                BranchQueryReceipts = CloneQueryReceipts(BranchQueryReceipts),
                ActionRequests = CloneActionRequests(ActionRequests),
                PendingAction = ClonePendingAction(PendingAction),
            };
        }

        public bool ResumeAction(NarrativeRuntimeActionResumeModel resume) {
            ClearLastError();
            if (!HasPendingAction() || PendingAction == null) {
                return SetFlowError("IRA005", "pendingAction", "Runtime has no pending action to resume.");
            }

            if (PendingAction.Status != "waiting") {
                return SetFlowError("IRA005",
                                    "pendingAction.status",
                                    "Runtime pending action is not waiting for resume: " + PendingAction.Status);
            }

            if (resume.RequestId != PendingAction.RequestId) {
                return SetFlowError("IRA006",
                                    "pendingAction.requestId",
                                    "Runtime action resume request id does not match pending action: " + resume.RequestId);
            }

            string status = NormalizeActionResumeStatus(resume.Status);
            if (status != "completed") {
                PendingAction.Status = status;
                PendingAction.HostPayload = resume.HostPayload;
                return SetFlowError("IRA007",
                                    "pendingAction." + PendingAction.RequestId,
                                    BuildActionResumeErrorMessage(PendingAction, resume, status));
            }

            PendingAction = null;
            StoryGraphNodeModel? node = CurrentNode;
            if (node == null) {
                return SetFlowError("IRF001", "currentNode", "Runtime current node is missing.");
            }

            return DispatchAvailableActions(node);
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

        NarrativeRuntimeReadingProgressModel SnapshotReadingProgress(StoryGraphNodeModel? node, StoryGraphNodeModel? visibleNode) {
            int contentStepCount = GetContentStepCount(node);
            int maxVisibleStepCount = GetMaxVisibleStepCount(node);
            return new NarrativeRuntimeReadingProgressModel {
                ContentStepCount = contentStepCount,
                MaxVisibleStepCount = maxVisibleStepCount,
                VisibleStepCount = State.VisibleStepCount,
                CanAdvance = !HasPendingAction() && State.VisibleStepCount < maxVisibleStepCount,
                CanRewind = !HasPendingAction() && State.VisibleStepCount > 0,
                IsChoiceStageVisible = !HasPendingAction() && visibleNode != null && visibleNode.Choices.Count > 0 && State.VisibleStepCount > contentStepCount,
                IsContinueStageVisible = node != null
                    && !HasPendingAction()
                    && (node.DefaultNext.Length > 0 || node.ConditionalJumps.Count > 0)
                    && State.VisibleStepCount > contentStepCount,
            };
        }

        bool TryResolveContinueTarget(StoryGraphNodeModel node, out string target) {
            target = string.Empty;

            for (int i = 0; i < node.ConditionalJumps.Count; i += 1) {
                DslScriptConditionalJumpModel jump = node.ConditionalJumps[i];
                if (!TryEvaluateCondition(jump.Condition,
                                          "conditional-jump",
                                          "conditionalJumps[" + i + "].condition",
                                          out bool conditionResult,
                                          -1,
                                          -1,
                                          i)) {
                    return false;
                }

                if (!conditionResult) {
                    continue;
                }

                if (jump.Target.Length == 0 || !nodesByName.ContainsKey(jump.Target)) {
                    return SetFlowError("IRF004",
                                        "conditionalJumps[" + i + "].target",
                                        "Runtime conditional jump target is not available: " + jump.Target);
                }

                target = jump.Target;
                return true;
            }

            if (node.DefaultNext.Length > 0) {
                if (!nodesByName.ContainsKey(node.DefaultNext)) {
                    return SetFlowError("IRF004",
                                        "defaultNext",
                                        "Runtime fallback target is not available: " + node.DefaultNext);
                }

                target = node.DefaultNext;
                return true;
            }

            return SetFlowError("IRF006", "continue", "Runtime has no conditional jump match or fallback target.");
        }

        bool TryResolveVisibleChoice(StoryGraphNodeModel node,
                                     int groupIndex,
                                     int visibleOptionIndex,
                                     out DslScriptChoiceOptionModel option,
                                     out int originalOptionIndex) {
            option = new DslScriptChoiceOptionModel();
            originalOptionIndex = -1;

            List<VisibleChoiceOptionResolution> visibleOptions = ResolveVisibleChoiceOptions(node.Choices[groupIndex],
                                                                                            groupIndex);
            if (LastError != null) {
                return false;
            }

            if (visibleOptionIndex < 0 || visibleOptionIndex >= visibleOptions.Count) {
                return SetFlowError("IRF003", "choice.optionIndex", "Runtime visible choice option is not available.");
            }

            option = visibleOptions[visibleOptionIndex].Option;
            originalOptionIndex = visibleOptions[visibleOptionIndex].OriginalOptionIndex;
            return true;
        }

        StoryGraphNodeModel? SnapshotVisibleNode(StoryGraphNodeModel? node) {
            if (node == null) {
                return null;
            }

            StoryGraphNodeModel snapshot = new StoryGraphNodeModel {
                Name = node.Name,
                Source = node.Source,
                DefaultNext = node.DefaultNext,
            };
            snapshot.Lines.AddRange(node.Lines);
            snapshot.ConditionalJumps.AddRange(node.ConditionalJumps);

            for (int groupIndex = 0; groupIndex < node.Choices.Count; groupIndex += 1) {
                DslScriptChoiceGroupModel group = node.Choices[groupIndex];
                List<VisibleChoiceOptionResolution> visibleOptions = ResolveVisibleChoiceOptions(group, groupIndex);
                if (visibleOptions.Count == 0) {
                    continue;
                }

                DslScriptChoiceGroupModel visibleGroup = new DslScriptChoiceGroupModel {
                    Prompt = group.Prompt,
                    Anchor = group.Anchor,
                    Source = group.Source,
                };
                for (int i = 0; i < visibleOptions.Count; i += 1) {
                    visibleGroup.Options.Add(visibleOptions[i].Option);
                }

                snapshot.Choices.Add(visibleGroup);
            }

            return snapshot;
        }

        List<VisibleChoiceOptionResolution> ResolveVisibleChoiceOptions(DslScriptChoiceGroupModel group,
                                                                        int groupIndex) {
            List<VisibleChoiceOptionResolution> visibleOptions = new List<VisibleChoiceOptionResolution>();
            for (int optionIndex = 0; optionIndex < group.Options.Count; optionIndex += 1) {
                DslScriptChoiceOptionModel option = group.Options[optionIndex];
                if (!TryEvaluateCondition(option.Condition,
                                          "choice-condition",
                                          "choices[" + groupIndex + "].options[" + optionIndex + "].condition",
                                          out bool conditionResult,
                                          groupIndex,
                                          optionIndex,
                                          -1)) {
                    return visibleOptions;
                }

                if (conditionResult) {
                    visibleOptions.Add(new VisibleChoiceOptionResolution(option, optionIndex));
                }
            }

            return visibleOptions;
        }

        bool TryEvaluateCondition(DslScriptConditionModel? condition,
                                  string context,
                                  string path,
                                  out bool conditionResult,
                                  int choiceGroupIndex,
                                  int choiceOptionIndex,
                                  int conditionalJumpIndex) {
            conditionResult = true;
            if (condition == null) {
                return true;
            }

            NarrativeRuntimeQueryReceiptScopeModel receiptScope = new NarrativeRuntimeQueryReceiptScopeModel {
                Context = context,
                NodeId = State.CurrentNodeName,
                BranchPath = path,
                ChoiceGroupIndex = choiceGroupIndex,
                ChoiceOptionIndex = choiceOptionIndex,
                ConditionalJumpIndex = conditionalJumpIndex,
            };
            NarrativeRuntimeConditionEvaluationModel evaluation = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(condition.Expression,
                                                                                                                    State,
                                                                                                                    QueryProvider,
                                                                                                                    context,
                                                                                                                    receiptScope,
                                                                                                                    BranchQueryReceipts);
            if (!evaluation.Succeeded) {
                LastError = CreateFlowError("IRF005",
                                            path,
                                            "Runtime condition evaluation failed.");
                LastError.ConditionDiagnostics.AddRange(evaluation.Diagnostics);
                return false;
            }

            conditionResult = evaluation.Value.BoolValue;
            return true;
        }

        bool EnterNode(string nodeName, bool resetPath) {
            if (!nodesByName.ContainsKey(nodeName)) {
                return SetFlowError("IRF004", "nodeName", "Runtime target node is not available: " + nodeName);
            }

            State.CurrentNodeName = nodeName;
            State.VisibleStepCount = 0;
            if (resetPath) {
                State.Path.Clear();
            }
            State.Path.Add(nodeName);
            RecordNodeVisit(nodeName);
            return DispatchAvailableActions(nodesByName[nodeName]);
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

        bool DispatchAvailableActions(StoryGraphNodeModel node) {
            if (HasPendingAction()) {
                return true;
            }

            int contentStepCount = 0;
            for (int i = 0; i < node.Lines.Count; i += 1) {
                DslScriptLineModel line = node.Lines[i];
                if (line.Kind != DslScriptLineKindModel.Metadata) {
                    contentStepCount += 1;
                    continue;
                }

                if (contentStepCount > State.VisibleStepCount) {
                    continue;
                }

                if (!TryCreateActionRequest(node, line, i, out NarrativeRuntimeActionRequestModel request)) {
                    continue;
                }

                string dispatchKey = CreateActionDispatchKey(node, line, i);
                if (dispatchedActionKeys.Contains(dispatchKey)) {
                    continue;
                }

                NarrativeRuntimeActionResultModel result = NarrativeRuntimeActionDispatcherDomain.Dispatch(request, ActionDispatcher);
                if (result.RequestWasSent) {
                    ActionRequests.Add(CloneActionRequest(request));
                    dispatchedActionKeys.Add(dispatchKey);
                }

                if (!result.Succeeded) {
                    return SetFlowError(result.ErrorCode.Length == 0 ? "IRF010" : result.ErrorCode,
                                        "action." + request.Name,
                                        result.ErrorMessage.Length == 0
                                            ? "Runtime action dispatch failed: " + request.Name
                                            : result.ErrorMessage);
                }

                if (request.Mode == "wait" && result.Status == "waiting") {
                    PendingAction = CreatePendingAction(request, result);
                    return true;
                }

                dispatchedActionKeys.Add(dispatchKey);
            }

            return true;
        }

        bool HasPendingAction() {
            return PendingAction != null;
        }

        bool SetPendingActionError() {
            if (PendingAction == null) {
                return SetFlowError("IRA005", "pendingAction", "Runtime is waiting for action resume.");
            }

            if (PendingAction.Status != "waiting") {
                return SetFlowError("IRA005",
                                    "pendingAction." + PendingAction.RequestId,
                                    "Runtime is stopped by action status " + PendingAction.Status + ": " + PendingAction.RequestId);
            }

            return SetFlowError("IRA005",
                                "pendingAction." + PendingAction.RequestId,
                                "Runtime is waiting for action resume: " + PendingAction.RequestId);
        }

        static NarrativeRuntimePendingActionModel CreatePendingAction(NarrativeRuntimeActionRequestModel request,
                                                                      NarrativeRuntimeActionResultModel result) {
            NarrativeRuntimePendingActionModel pending = new NarrativeRuntimePendingActionModel {
                RequestId = request.RequestId,
                Name = request.Name,
                Mode = request.Mode,
                HandlerName = request.HandlerName,
                Status = "waiting",
                NodeId = request.NodeId,
                LineId = request.LineId,
                SourceLine = request.SourceLine,
                SourceColumn = request.SourceColumn,
                Raw = request.Raw,
                HostPayload = result.HostPayload,
            };

            for (int i = 0; i < request.Arguments.Count; i += 1) {
                NarrativeRuntimeActionArgumentModel argument = request.Arguments[i];
                pending.Arguments.Add(new NarrativeRuntimeActionArgumentModel {
                    Index = argument.Index,
                    Raw = argument.Raw,
                    Value = CloneQueryValue(argument.Value),
                    SourceLine = argument.SourceLine,
                    SourceColumn = argument.SourceColumn,
                });
            }

            return pending;
        }

        static string NormalizeActionResumeStatus(string status) {
            string normalized = status.Trim().ToLowerInvariant();
            return normalized.Length == 0 ? "completed" : normalized;
        }

        static string BuildActionResumeErrorMessage(NarrativeRuntimePendingActionModel pending,
                                                    NarrativeRuntimeActionResumeModel resume,
                                                    string status) {
            if (resume.ErrorMessage.Length > 0) {
                return resume.ErrorMessage;
            }

            if (resume.ErrorCode.Length > 0) {
                return "Runtime action resume failed for '" + pending.Name + "' with status " + status + ": " + resume.ErrorCode;
            }

            return "Runtime action resume failed for '" + pending.Name + "' with status " + status + ".";
        }

        bool TryCreateActionRequest(StoryGraphNodeModel node,
                                    DslScriptLineModel line,
                                    int lineIndex,
                                    out NarrativeRuntimeActionRequestModel request) {
            request = new NarrativeRuntimeActionRequestModel();
            string raw = line.Raw.Length > 0 ? line.Raw : line.Text;
            int atIndex = FirstNonWhitespaceIndex(raw);
            if (atIndex < 0) {
                return false;
            }

            if (!StartsWithToken(raw, atIndex, "@emit")) {
                return false;
            }

            int nameStart = SkipWhitespace(raw, atIndex + 5);
            if (nameStart >= raw.Length || !IsIdentifierStart(raw[nameStart])) {
                request.Name = string.Empty;
                request.NodeId = node.Name;
                request.SourceLine = line.Source.Line;
                request.SourceColumn = atIndex + 1;
                return false;
            }

            int nameEnd = nameStart + 1;
            while (nameEnd < raw.Length && IsActionNamePart(raw[nameEnd])) {
                nameEnd += 1;
            }

            string name = raw.Substring(nameStart, nameEnd - nameStart);
            request.RequestId = "action-" + (ActionRequests.Count + 1);
            request.Name = name;
            request.NodeId = node.Name;
            request.LineId = CreateActionLineId(line, lineIndex);
            request.SourceLine = line.Source.Line;
            request.SourceColumn = atIndex + 1;
            request.Raw = raw.Substring(atIndex).TrimEnd();
            AddActionArguments(request, raw, line.Source.Line, nameEnd);
            return true;
        }

        void AddActionArguments(NarrativeRuntimeActionRequestModel request,
                                string raw,
                                int sourceLine,
                                int startIndex) {
            int index = startIndex;
            while (index < raw.Length) {
                index = SkipWhitespace(raw, index);
                if (index >= raw.Length) {
                    return;
                }

                int tokenStart = index;
                string tokenRaw;
                bool tokenClosed = true;
                if (raw[index] == '"') {
                    index += 1;
                    tokenClosed = false;
                    while (index < raw.Length) {
                        if (raw[index] == '\\' && index + 1 < raw.Length) {
                            index += 2;
                            continue;
                        }

                        if (raw[index] == '"') {
                            index += 1;
                            tokenClosed = true;
                            break;
                        }

                        index += 1;
                    }

                    tokenRaw = raw.Substring(tokenStart, index - tokenStart);
                } else {
                    while (index < raw.Length && !char.IsWhiteSpace(raw[index])) {
                        index += 1;
                    }

                    tokenRaw = raw.Substring(tokenStart, index - tokenStart);
                }

                request.Arguments.Add(new NarrativeRuntimeActionArgumentModel {
                    Index = request.Arguments.Count,
                    Raw = tokenRaw,
                    Value = ParseActionArgumentValue(tokenRaw, tokenClosed),
                    SourceLine = sourceLine,
                    SourceColumn = tokenStart + 1,
                });
            }
        }

        static NarrativeRuntimeQueryValueModel ParseActionArgumentValue(string raw, bool tokenClosed) {
            if (!tokenClosed) {
                return new NarrativeRuntimeQueryValueModel {
                    Kind = NarrativeRuntimeQueryValueKindModel.Unknown,
                };
            }

            if (raw.Length >= 2 && raw[0] == '"' && raw[raw.Length - 1] == '"') {
                return NarrativeRuntimeQueryValueModel.FromString(UnescapeActionString(raw.Substring(1, raw.Length - 2)));
            }

            if (bool.TryParse(raw, out bool boolValue)) {
                return NarrativeRuntimeQueryValueModel.FromBool(boolValue);
            }

            if (double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out double numberValue)) {
                return NarrativeRuntimeQueryValueModel.FromNumber(numberValue);
            }

            return NarrativeRuntimeQueryValueModel.FromString(raw);
        }

        static string UnescapeActionString(string value) {
            return value.Replace("\\\"", "\"").Replace("\\\\", "\\");
        }

        string CreateActionDispatchKey(StoryGraphNodeModel node, DslScriptLineModel line, int lineIndex) {
            return State.Path.Count.ToString(CultureInfo.InvariantCulture)
                   + ":"
                   + node.Name
                   + ":"
                   + line.Source.Line.ToString(CultureInfo.InvariantCulture)
                   + ":"
                   + line.Source.Column.ToString(CultureInfo.InvariantCulture)
                   + ":"
                   + lineIndex.ToString(CultureInfo.InvariantCulture);
        }

        static string CreateActionLineId(DslScriptLineModel line, int lineIndex) {
            if (line.Anchor.Length > 0) {
                return line.Anchor;
            }

            if (line.Source.Line > 0) {
                return "line:" + line.Source.Line.ToString(CultureInfo.InvariantCulture);
            }

            return "metadata:" + lineIndex.ToString(CultureInfo.InvariantCulture);
        }

        static int FirstNonWhitespaceIndex(string value) {
            for (int i = 0; i < value.Length; i += 1) {
                if (!char.IsWhiteSpace(value[i])) {
                    return i;
                }
            }

            return -1;
        }

        static int SkipWhitespace(string value, int startIndex) {
            int index = startIndex;
            while (index < value.Length && char.IsWhiteSpace(value[index])) {
                index += 1;
            }

            return index;
        }

        static bool StartsWithToken(string value, int startIndex, string token) {
            if (startIndex + token.Length > value.Length) {
                return false;
            }

            if (!string.Equals(value.Substring(startIndex, token.Length), token, StringComparison.Ordinal)) {
                return false;
            }

            int after = startIndex + token.Length;
            return after >= value.Length || char.IsWhiteSpace(value[after]);
        }

        static bool IsIdentifierStart(char value) {
            return value == '_' || (value >= 'A' && value <= 'Z') || (value >= 'a' && value <= 'z');
        }

        static bool IsActionNamePart(char value) {
            return IsIdentifierStart(value) || (value >= '0' && value <= '9') || value == '.' || value == '-';
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

        void ClearLastError() {
            LastError = null;
        }

        bool SetFlowError(string code, string path, string message) {
            LastError = CreateFlowError(code, path, message);
            return false;
        }

        static NarrativeRuntimeFlowErrorModel CreateFlowError(string code, string path, string message) {
            return new NarrativeRuntimeFlowErrorModel {
                Code = code,
                Severity = "error",
                Path = path,
                Message = message,
            };
        }

        static NarrativeRuntimeFlowErrorModel? CloneLastError(NarrativeRuntimeFlowErrorModel? error) {
            if (error == null) {
                return null;
            }

            NarrativeRuntimeFlowErrorModel clone = new NarrativeRuntimeFlowErrorModel {
                Code = error.Code,
                Severity = error.Severity,
                Path = error.Path,
                Message = error.Message,
            };
            clone.ConditionDiagnostics.AddRange(error.ConditionDiagnostics);
            return clone;
        }

        static List<NarrativeRuntimeQueryReceiptModel> CloneQueryReceipts(IReadOnlyList<NarrativeRuntimeQueryReceiptModel> receipts) {
            List<NarrativeRuntimeQueryReceiptModel> clone = new List<NarrativeRuntimeQueryReceiptModel>();
            for (int i = 0; i < receipts.Count; i += 1) {
                NarrativeRuntimeQueryReceiptModel receipt = receipts[i];
                NarrativeRuntimeQueryReceiptModel receiptClone = new NarrativeRuntimeQueryReceiptModel {
                    Id = receipt.Id,
                    Context = receipt.Context,
                    NodeId = receipt.NodeId,
                    BranchPath = receipt.BranchPath,
                    ChoiceGroupIndex = receipt.ChoiceGroupIndex,
                    ChoiceOptionIndex = receipt.ChoiceOptionIndex,
                    ConditionalJumpIndex = receipt.ConditionalJumpIndex,
                    SourceLine = receipt.SourceLine,
                    SourceColumn = receipt.SourceColumn,
                    Name = receipt.Name,
                    Syntax = receipt.Syntax,
                    Result = CloneQueryValue(receipt.Result),
                    SourceKind = receipt.SourceKind,
                    Deterministic = receipt.Deterministic,
                };
                for (int argumentIndex = 0; argumentIndex < receipt.Arguments.Count; argumentIndex += 1) {
                    receiptClone.Arguments.Add(CloneQueryValue(receipt.Arguments[argumentIndex]));
                }

                clone.Add(receiptClone);
            }

            return clone;
        }

        static List<NarrativeRuntimeActionRequestModel> CloneActionRequests(IReadOnlyList<NarrativeRuntimeActionRequestModel> requests) {
            List<NarrativeRuntimeActionRequestModel> clone = new List<NarrativeRuntimeActionRequestModel>();
            for (int i = 0; i < requests.Count; i += 1) {
                clone.Add(CloneActionRequest(requests[i]));
            }

            return clone;
        }

        static NarrativeRuntimeActionRequestModel CloneActionRequest(NarrativeRuntimeActionRequestModel request) {
            NarrativeRuntimeActionRequestModel clone = new NarrativeRuntimeActionRequestModel {
                RequestId = request.RequestId,
                Name = request.Name,
                Mode = request.Mode,
                HandlerName = request.HandlerName,
                NodeId = request.NodeId,
                LineId = request.LineId,
                SourceLine = request.SourceLine,
                SourceColumn = request.SourceColumn,
                Raw = request.Raw,
            };

            for (int argumentIndex = 0; argumentIndex < request.Arguments.Count; argumentIndex += 1) {
                NarrativeRuntimeActionArgumentModel argument = request.Arguments[argumentIndex];
                clone.Arguments.Add(new NarrativeRuntimeActionArgumentModel {
                    Index = argument.Index,
                    Raw = argument.Raw,
                    Value = CloneQueryValue(argument.Value),
                    SourceLine = argument.SourceLine,
                    SourceColumn = argument.SourceColumn,
                });
            }

            return clone;
        }

        static NarrativeRuntimePendingActionModel? ClonePendingAction(NarrativeRuntimePendingActionModel? pending) {
            if (pending == null) {
                return null;
            }

            NarrativeRuntimePendingActionModel clone = new NarrativeRuntimePendingActionModel {
                RequestId = pending.RequestId,
                Name = pending.Name,
                Mode = pending.Mode,
                HandlerName = pending.HandlerName,
                Status = pending.Status,
                NodeId = pending.NodeId,
                LineId = pending.LineId,
                SourceLine = pending.SourceLine,
                SourceColumn = pending.SourceColumn,
                Raw = pending.Raw,
                HostPayload = pending.HostPayload,
            };

            for (int argumentIndex = 0; argumentIndex < pending.Arguments.Count; argumentIndex += 1) {
                NarrativeRuntimeActionArgumentModel argument = pending.Arguments[argumentIndex];
                clone.Arguments.Add(new NarrativeRuntimeActionArgumentModel {
                    Index = argument.Index,
                    Raw = argument.Raw,
                    Value = CloneQueryValue(argument.Value),
                    SourceLine = argument.SourceLine,
                    SourceColumn = argument.SourceColumn,
                });
            }

            return clone;
        }

        static NarrativeRuntimeQueryValueModel CloneQueryValue(NarrativeRuntimeQueryValueModel value) {
            if (value.Kind == NarrativeRuntimeQueryValueKindModel.String) {
                return NarrativeRuntimeQueryValueModel.FromString(value.StringValue);
            }

            if (value.Kind == NarrativeRuntimeQueryValueKindModel.Number) {
                return NarrativeRuntimeQueryValueModel.FromNumber(value.NumberValue);
            }

            if (value.Kind == NarrativeRuntimeQueryValueKindModel.Bool) {
                return NarrativeRuntimeQueryValueModel.FromBool(value.BoolValue);
            }

            return new NarrativeRuntimeQueryValueModel {
                Kind = value.Kind,
            };
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
            bool hasTerminalChoiceStage = node.Choices.Count > 0 || node.ConditionalJumps.Count > 0 || node.DefaultNext.Length > 0;
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

        sealed class VisibleChoiceOptionResolution {

            public DslScriptChoiceOptionModel Option { get; }

            public int OriginalOptionIndex { get; }

            public VisibleChoiceOptionResolution(DslScriptChoiceOptionModel option, int originalOptionIndex) {
                Option = option;
                OriginalOptionIndex = originalOptionIndex;
            }

        }

    }

}
