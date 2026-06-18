using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Runtime;
using System.Text;
using System.Text.Json;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void NarrativeRuntimeConsumesCompilerGraph() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
旁白：开始。
? 下一步
  - 去第二页 -> second.node

# second.node
旁白：第二页。
-> end.node

# end.node
旁白：结束。
""");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);

            AssertTrue(runtime.Start("start"), "Runtime should start at explicit entry.");
            AssertEqual("start", runtime.State.CurrentNodeName, "Runtime current node after start");
            AssertEqual(0, runtime.State.VisibleStepCount, "Runtime visible step count after start");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should advance flow inside the current node.");
            AssertEqual(1, runtime.State.VisibleStepCount, "Runtime visible step count after first flow advance");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the terminal choice stage.");
            AssertEqual(2, runtime.State.VisibleStepCount, "Runtime visible step count after second flow advance");
            AssertTrue(runtime.RewindFlow(), "Runtime should rewind flow inside the current node.");
            AssertEqual(1, runtime.State.VisibleStepCount, "Runtime visible step count after flow rewind");
            AssertTrue(runtime.Choose(0, 0), "Runtime should choose a valid option.");
            AssertEqual("second.node", runtime.State.CurrentNodeName, "Runtime current node after choice");
            AssertEqual(0, runtime.State.VisibleStepCount, "Runtime visible step count resets after node change");
            AssertTrue(runtime.Rewind(), "Runtime should rewind a visited path.");
            AssertEqual("start", runtime.State.CurrentNodeName, "Runtime current node after rewind");
            AssertEqual(1, runtime.State.Path.Count, "Runtime path count after rewind");
            AssertEqual(2, runtime.State.VisibleStepCount, "Runtime rewind should restore the previous node as fully revealed");
            AssertTrue(runtime.Choose(0, 0), "Runtime should choose again after rewind.");
            AssertTrue(runtime.Continue(), "Runtime should follow default next.");
            AssertEqual("end.node", runtime.State.CurrentNodeName, "Runtime current node after continue");
            AssertEqual(3, runtime.State.Path.Count, "Runtime path count");
        }

        static void NarrativeRuntimeRecordsInternalNarrativeFacts() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
""");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);

            AssertTrue(runtime.Start("start"), "Runtime should start at explicit entry.");
            AssertEqual(1, runtime.State.Facts.VisitedNodes.Count, "Runtime visit fact count after start");
            AssertEqual("start", runtime.State.Facts.VisitedNodes[0].NodeName, "Runtime visit fact node");
            AssertEqual(1, runtime.State.Facts.VisitedNodes[0].Count, "Runtime visit fact count");

            string firstLineAnchor = runtime.CurrentNode?.Lines[0].Anchor ?? string.Empty;
            string optionAnchor = runtime.CurrentNode?.Choices[0].Options[0].Anchor ?? string.Empty;

            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the first content line.");
            AssertEqual(1, runtime.State.Facts.SeenLineAnchors.Count, "Runtime seen line fact count");
            AssertEqual(firstLineAnchor, runtime.State.Facts.SeenLineAnchors[0], "Runtime seen line anchor");

            AssertTrue(runtime.Choose(0, 0), "Runtime should choose a valid option.");
            AssertEqual(2, runtime.State.Facts.VisitedNodes.Count, "Runtime visit fact count after choice");
            AssertEqual("second.node", runtime.State.Facts.VisitedNodes[1].NodeName, "Runtime second visit node");
            AssertEqual(1, runtime.State.Facts.ChoiceHistory.Count, "Runtime choice fact count");
            AssertEqual("start", runtime.State.Facts.ChoiceHistory[0].NodeName, "Runtime choice fact source node");
            AssertEqual(optionAnchor, runtime.State.Facts.ChoiceHistory[0].OptionAnchor, "Runtime choice fact option anchor");
            AssertEqual("second.node", runtime.State.Facts.ChoiceHistory[0].TargetNodeName, "Runtime choice fact target");

            NarrativeRuntimeQueryProviderModel provider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            NarrativeRuntimeQueryResultModel visited = NarrativeRuntimeQueryProviderDomain.Resolve(
                CreateQueryRequest("visited", "start"),
                runtime.State,
                provider);
            NarrativeRuntimeQueryResultModel seen = NarrativeRuntimeQueryProviderDomain.Resolve(
                CreateQueryRequest("seen", firstLineAnchor),
                runtime.State,
                provider);
            NarrativeRuntimeQueryResultModel lastChoice = NarrativeRuntimeQueryProviderDomain.Resolve(
                CreateQueryRequest("last_choice", "start"),
                runtime.State,
                provider);

            AssertTrue(visited.Found && visited.Value.BoolValue, "Runtime internal query should report visited node.");
            AssertTrue(seen.Found && seen.Value.BoolValue, "Runtime internal query should report seen line.");
            AssertEqual(optionAnchor, lastChoice.Value.StringValue, "Runtime internal query should report last choice.");
            AssertEqual(NarrativeRuntimeQuerySourceKindModel.InternalFact, lastChoice.SourceKind, "Runtime internal query source kind");
        }

        static void NarrativeRuntimeQueryProviderUsesDelegateMockAndRecordedSources() {
            NarrativeRuntimeStateModel state = new NarrativeRuntimeStateModel();
            state.CurrentNodeName = "start";
            state.Path.Add("start");

            NarrativeRuntimeQueryRequestModel request = CreateQueryRequest("has_item", "silver_key");

            NarrativeRuntimeQueryProviderModel delegateProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Delegate,
                DelegateQuery = _ => new NarrativeRuntimeQueryResultModel {
                    Found = true,
                    Value = NarrativeRuntimeQueryValueModel.FromBool(true),
                },
            };
            delegateProvider.MockValues.Add(CreateValueEntry("has_item", "silver_key", NarrativeRuntimeQueryValueModel.FromBool(false)));
            NarrativeRuntimeQueryResultModel delegated = NarrativeRuntimeQueryProviderDomain.Resolve(request, state, delegateProvider);
            AssertTrue(delegated.Found && delegated.Value.BoolValue, "Delegate provider should use host delegate truth.");
            AssertEqual(NarrativeRuntimeQuerySourceKindModel.Delegate, delegated.SourceKind, "Delegate provider source kind");
            AssertFalse(delegated.IsDeterministic, "Delegate provider result is not guaranteed deterministic by Runtime.");

            NarrativeRuntimeQueryProviderModel mockProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            mockProvider.MockValues.Add(CreateValueEntry("has_item", "silver_key", NarrativeRuntimeQueryValueModel.FromBool(false)));
            NarrativeRuntimeQueryResultModel mocked = NarrativeRuntimeQueryProviderDomain.Resolve(request, state, mockProvider);
            AssertTrue(mocked.Found && !mocked.Value.BoolValue, "Mock provider should use editor/test values.");
            AssertEqual(NarrativeRuntimeQuerySourceKindModel.Mock, mocked.SourceKind, "Mock provider source kind");
            AssertTrue(mocked.IsReadOnly && mocked.IsDeterministic, "Mock provider values should be read-only and deterministic.");

            NarrativeRuntimeQueryProviderModel recordedProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Recorded,
            };
            recordedProvider.RecordedValues.Add(CreateValueEntry("has_item", "silver_key", NarrativeRuntimeQueryValueModel.FromBool(true)));
            NarrativeRuntimeQueryResultModel recorded = NarrativeRuntimeQueryProviderDomain.Resolve(request, state, recordedProvider);
            AssertTrue(recorded.Found && recorded.Value.BoolValue, "Recorded provider should use replay values.");
            AssertEqual(NarrativeRuntimeQuerySourceKindModel.Recorded, recorded.SourceKind, "Recorded provider source kind");

            NarrativeRuntimeQueryResultModel currentNode = NarrativeRuntimeQueryProviderDomain.Resolve(
                CreateQueryRequest("current_node"),
                state,
                recordedProvider);
            AssertTrue(currentNode.Found, "Internal facts should resolve before external provider sources.");
            AssertEqual("start", currentNode.Value.StringValue, "Internal current node query value");
            AssertEqual(NarrativeRuntimeQuerySourceKindModel.InternalFact, currentNode.SourceKind, "Internal query source kind");
        }

        static void NarrativeRuntimeConditionEvaluatorEvaluatesCompilerIr() {
            DslScriptConditionExpressionModel expression = ReadChoiceConditionExpression(
                "has_item(\"silver_key\") and trust(mira) >= 3 and not debug_mode");

            NarrativeRuntimeStateModel state = new NarrativeRuntimeStateModel();
            state.CurrentNodeName = "start";
            state.Path.Add("start");

            NarrativeRuntimeQueryProviderModel provider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            provider.MockValues.Add(CreateValueEntry("has_item",
                                                     NarrativeRuntimeQueryValueModel.FromBool(true),
                                                     NarrativeRuntimeQueryValueModel.FromString("silver_key")));
            provider.MockValues.Add(CreateValueEntry("trust",
                                                     NarrativeRuntimeQueryValueModel.FromNumber(4),
                                                     NarrativeRuntimeQueryValueModel.FromString("mira")));
            provider.MockValues.Add(CreateValueEntry("debug_mode",
                                                     NarrativeRuntimeQueryValueModel.FromBool(false)));

            NarrativeRuntimeConditionEvaluationModel evaluation = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                expression,
                state,
                provider,
                "choice-condition");

            AssertTrue(evaluation.Succeeded, "Runtime condition evaluator should evaluate compiler IR.");
            AssertEqual(NarrativeRuntimeQueryValueKindModel.Bool, evaluation.Value.Kind, "Runtime condition result kind");
            AssertTrue(evaluation.Value.BoolValue, "Runtime condition result value");
            AssertEqual(0, evaluation.Diagnostics.Count, "Runtime condition diagnostics");
        }

        static void NarrativeRuntimeConditionEvaluatorUsesInternalFactsAndShortCircuit() {
            DslScriptConditionExpressionModel expression = ReadChoiceConditionExpression(
                "visited(\"gate.knock\") or host_explodes()");

            NarrativeRuntimeStateModel state = new NarrativeRuntimeStateModel();
            state.Facts.VisitedNodes.Add(new NarrativeRuntimeNodeVisitFactModel {
                NodeName = "gate.knock",
                Count = 1,
            });

            NarrativeRuntimeQueryProviderModel provider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Delegate,
                DelegateQuery = _ => throw new InvalidOperationException("short circuit should skip delegate"),
            };

            NarrativeRuntimeConditionEvaluationModel evaluation = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                expression,
                state,
                provider,
                "conditional-jump");

            AssertTrue(evaluation.Succeeded, "Runtime condition evaluator should use internal facts before delegate queries.");
            AssertTrue(evaluation.Value.BoolValue, "Runtime condition internal fact result");
        }

        static void NarrativeRuntimeConditionEvaluatorUsesRecordedProviderValues() {
            DslScriptConditionExpressionModel expression = ReadChoiceConditionExpression("has_item(\"silver_key\")");
            NarrativeRuntimeStateModel state = new NarrativeRuntimeStateModel();
            NarrativeRuntimeQueryProviderModel provider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Recorded,
            };
            provider.RecordedValues.Add(CreateValueEntry("has_item",
                                                        NarrativeRuntimeQueryValueModel.FromBool(true),
                                                        NarrativeRuntimeQueryValueModel.FromString("silver_key")));

            NarrativeRuntimeConditionEvaluationModel evaluation = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                expression,
                state,
                provider,
                "choice-condition");

            AssertTrue(evaluation.Succeeded, "Runtime condition evaluator should use recorded provider values.");
            AssertTrue(evaluation.Value.BoolValue, "Runtime condition recorded provider result");
        }

        static void NarrativeRuntimeConditionEvaluatorReportsRuntimeErrors() {
            NarrativeRuntimeStateModel state = new NarrativeRuntimeStateModel();

            NarrativeRuntimeConditionEvaluationModel missingQuery = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                ReadChoiceConditionExpression("missing_query()"),
                state,
                new NarrativeRuntimeQueryProviderModel {
                    Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
                },
                "choice-condition");
            AssertFalse(missingQuery.Succeeded, "Missing query should fail runtime condition evaluation.");
            AssertEqual("IRC003", FirstConditionDiagnosticCode(missingQuery), "Missing query diagnostic code");

            NarrativeRuntimeQueryProviderModel mismatchProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            mismatchProvider.MockValues.Add(CreateValueEntry("trust",
                                                            NarrativeRuntimeQueryValueModel.FromNumber(4),
                                                            NarrativeRuntimeQueryValueModel.FromString("mira")));
            NarrativeRuntimeConditionEvaluationModel typeMismatch = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                ReadChoiceConditionExpression("trust(\"mira\") >= \"high\""),
                state,
                mismatchProvider,
                "choice-condition");
            AssertFalse(typeMismatch.Succeeded, "Type mismatch should fail runtime condition evaluation.");
            AssertEqual("IRC006", FirstConditionDiagnosticCode(typeMismatch), "Type mismatch diagnostic code");

            NarrativeRuntimeConditionEvaluationModel providerError = NarrativeRuntimeConditionEvaluatorDomain.Evaluate(
                ReadChoiceConditionExpression("host_query()"),
                state,
                new NarrativeRuntimeQueryProviderModel {
                    Kind = NarrativeRuntimeQueryProviderKindModel.Delegate,
                    DelegateQuery = _ => throw new InvalidOperationException("host failure"),
                },
                "choice-condition");
            AssertFalse(providerError.Succeeded, "Provider exception should fail runtime condition evaluation.");
            AssertEqual("IRC004", FirstConditionDiagnosticCode(providerError), "Provider exception diagnostic code");
        }

        static void NarrativeRuntimeFiltersConditionalChoicesByVisibleIndex() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
? Choose
- [has_item("silver_key")] Use silver key -> gate.open
- Knock -> gate.knock

# gate.open
Narrator: Open.

# gate.knock
Narrator: Knock.
""");
            AssertFalse(compilation.HasErrors, "Conditional choice fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("has_item",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(false),
                                                                  NarrativeRuntimeQueryValueModel.FromString("silver_key")));

            AssertTrue(runtime.Start("start"), "Runtime should start conditional choice fixture.");
            NarrativeRuntimeSnapshotModel snapshot = runtime.CreateSnapshot();
            AssertEqual(1, snapshot.CurrentNode?.Choices[0].Options.Count ?? -1, "Runtime snapshot should expose only visible options.");
            AssertEqual("Knock", snapshot.CurrentNode?.Choices[0].Options[0].Text ?? string.Empty, "Runtime visible option text");
            AssertEqual(1, runtime.BranchQueryReceipts.Count, "Runtime should record choice condition query receipt.");
            AssertEqual(1, snapshot.BranchQueryReceipts.Count, "Runtime snapshot should expose branch query receipts separately.");
            NarrativeRuntimeQueryReceiptModel choiceReceipt = snapshot.BranchQueryReceipts[0];
            AssertEqual("query-1", choiceReceipt.Id, "Choice query receipt id");
            AssertEqual("choice-condition", choiceReceipt.Context, "Choice query receipt context");
            AssertEqual("start", choiceReceipt.NodeId, "Choice query receipt node id");
            AssertEqual("choices[0].options[0].condition", choiceReceipt.BranchPath, "Choice query receipt branch path");
            AssertEqual(0, choiceReceipt.ChoiceGroupIndex, "Choice query receipt group index");
            AssertEqual(0, choiceReceipt.ChoiceOptionIndex, "Choice query receipt option index");
            AssertEqual(-1, choiceReceipt.ConditionalJumpIndex, "Choice query receipt jump index");
            AssertEqual(3, choiceReceipt.SourceLine, "Choice query receipt source line");
            AssertEqual(4, choiceReceipt.SourceColumn, "Choice query receipt source column");
            AssertEqual("has_item", choiceReceipt.Name, "Choice query receipt name");
            AssertEqual("call", choiceReceipt.Syntax, "Choice query receipt syntax");
            AssertEqual(1, choiceReceipt.Arguments.Count, "Choice query receipt argument count");
            AssertEqual("silver_key", choiceReceipt.Arguments[0].StringValue, "Choice query receipt argument value");
            AssertEqual(NarrativeRuntimeQueryValueKindModel.Bool, choiceReceipt.Result.Kind, "Choice query receipt result kind");
            AssertFalse(choiceReceipt.Result.BoolValue, "Choice query receipt result value");
            AssertEqual("mock", choiceReceipt.SourceKind, "Choice query receipt source kind");
            AssertTrue(choiceReceipt.Deterministic, "Choice query receipt deterministic flag");

            AssertFalse(runtime.Choose(0, 1), "Runtime should reject a missing visible option index.");
            AssertEqual("IRF003", runtime.LastError?.Code ?? string.Empty, "Runtime missing visible option error");

            AssertTrue(runtime.Choose(0, 0), "Runtime should choose the first visible option.");
            AssertEqual("gate.knock", runtime.State.CurrentNodeName, "Runtime choice should use visible option index.");
            AssertEqual(1, runtime.State.Facts.ChoiceHistory[0].OptionIndex, "Runtime choice fact should preserve original option index.");
        }

        static void NarrativeRuntimeFollowsFirstTrueConditionalJump() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? [has_item("silver_key")] -> gate.open
? [trust("mira") >= 3] -> mira.help
-> gate.locked

# gate.open
Narrator: Open.

# mira.help
Narrator: Help.

# gate.locked
Narrator: Locked.
""");
            AssertFalse(compilation.HasErrors, "Conditional jump fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("has_item",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(true),
                                                                  NarrativeRuntimeQueryValueModel.FromString("silver_key")));
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("trust",
                                                                  NarrativeRuntimeQueryValueModel.FromNumber(5),
                                                                  NarrativeRuntimeQueryValueModel.FromString("mira")));

            AssertTrue(runtime.Start("start"), "Runtime should start conditional jump fixture.");
            AssertTrue(runtime.Continue(), "Runtime should follow a true conditional jump.");
            AssertEqual("gate.open", runtime.State.CurrentNodeName, "Runtime conditional jump should use first true target.");
            AssertEqual(1, runtime.BranchQueryReceipts.Count, "Runtime should record first true conditional jump query receipt.");
            NarrativeRuntimeQueryReceiptModel jumpReceipt = runtime.BranchQueryReceipts[0];
            AssertEqual("query-1", jumpReceipt.Id, "Conditional jump receipt id");
            AssertEqual("conditional-jump", jumpReceipt.Context, "Conditional jump receipt context");
            AssertEqual("start", jumpReceipt.NodeId, "Conditional jump receipt node id");
            AssertEqual("conditionalJumps[0].condition", jumpReceipt.BranchPath, "Conditional jump receipt branch path");
            AssertEqual(-1, jumpReceipt.ChoiceGroupIndex, "Conditional jump receipt choice group index");
            AssertEqual(-1, jumpReceipt.ChoiceOptionIndex, "Conditional jump receipt choice option index");
            AssertEqual(0, jumpReceipt.ConditionalJumpIndex, "Conditional jump receipt jump index");
            AssertEqual(3, jumpReceipt.SourceLine, "Conditional jump receipt source line");
            AssertEqual(4, jumpReceipt.SourceColumn, "Conditional jump receipt source column");
            AssertEqual("has_item", jumpReceipt.Name, "Conditional jump receipt name");
            AssertEqual("call", jumpReceipt.Syntax, "Conditional jump receipt syntax");
            AssertEqual(1, jumpReceipt.Arguments.Count, "Conditional jump receipt argument count");
            AssertEqual("silver_key", jumpReceipt.Arguments[0].StringValue, "Conditional jump receipt argument value");
            AssertEqual(NarrativeRuntimeQueryValueKindModel.Bool, jumpReceipt.Result.Kind, "Conditional jump receipt result kind");
            AssertTrue(jumpReceipt.Result.BoolValue, "Conditional jump receipt result value");
            AssertEqual("mock", jumpReceipt.SourceKind, "Conditional jump receipt source kind");
            AssertTrue(jumpReceipt.Deterministic, "Conditional jump receipt deterministic flag");

            string serializedState = JsonSerializer.Serialize(runtime.ExportState("script-v1", "checkpoint-opaque-1"));
            AssertFalse(serializedState.Contains("receipt", StringComparison.OrdinalIgnoreCase), "Runtime export state should not include branch query receipts.");
        }

        static void NarrativeRuntimeFollowsConditionalFallback() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? [has_item("silver_key")] -> gate.open
? [trust("mira") >= 3] -> mira.help
-> gate.locked

# gate.open
Narrator: Open.

# mira.help
Narrator: Help.

# gate.locked
Narrator: Locked.
""");
            AssertFalse(compilation.HasErrors, "Conditional fallback fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("has_item",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(false),
                                                                  NarrativeRuntimeQueryValueModel.FromString("silver_key")));
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("trust",
                                                                  NarrativeRuntimeQueryValueModel.FromNumber(1),
                                                                  NarrativeRuntimeQueryValueModel.FromString("mira")));

            AssertTrue(runtime.Start("start"), "Runtime should start conditional fallback fixture.");
            AssertTrue(runtime.Continue(), "Runtime should follow fallback when conditional jumps are false.");
            AssertEqual("gate.locked", runtime.State.CurrentNodeName, "Runtime conditional fallback target");
        }

        static void NarrativeRuntimeReportsMissingConditionalFallback() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? [has_item("silver_key")] -> gate.open

# gate.open
Narrator: Open.
""");
            AssertTrue(compilation.HasErrors, "Compiler should still report missing conditional fallback.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("has_item",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(false),
                                                                  NarrativeRuntimeQueryValueModel.FromString("silver_key")));

            AssertTrue(runtime.Start("start"), "Runtime should start missing fallback fixture for error-path coverage.");
            AssertFalse(runtime.Continue(), "Runtime should fail when no conditional jump matches and no fallback exists.");
            AssertEqual("IRF006", runtime.LastError?.Code ?? string.Empty, "Runtime missing conditional fallback error");
        }

        static void NarrativeRuntimeDispatchesFireActionsAndContinues() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit play_timeline "mira_reveal"
Narrator: Open.
@emit mark_checkpoint true 3 door-id
Narrator: Done.
-> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Fire action fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.ActionDispatcher.Actions.Add(CreateActionCapability("play_timeline", "fire"));
            runtime.ActionDispatcher.Actions.Add(CreateActionCapability("mark_checkpoint", "fire"));
            runtime.ActionDispatcher.Handlers.Add(CreateActionHandler("play_timeline", "TimelineBridge.PlayTimeline"));
            runtime.ActionDispatcher.Handlers.Add(CreateActionHandler("mark_checkpoint", "RuntimeBridge.MarkCheckpoint"));
            int dispatchCount = 0;
            runtime.ActionDispatcher.DispatchAction = request => {
                dispatchCount += 1;
                AssertTrue(request.Mode == "fire", "Fire action request should use fire mode.");
                AssertTrue(request.HandlerName.Length > 0, "Fire action request should include Host Bridge handler mapping.");
                return new NarrativeRuntimeActionResultModel();
            };

            AssertTrue(runtime.Start("start"), "Runtime should start and dispatch leading fire action.");
            AssertEqual(1, dispatchCount, "Leading fire action dispatch count");
            AssertEqual(1, runtime.ActionRequests.Count, "Runtime should record leading fire action request.");
            NarrativeRuntimeActionRequestModel first = runtime.ActionRequests[0];
            AssertEqual("action-1", first.RequestId, "First action request id");
            AssertEqual("play_timeline", first.Name, "First action name");
            AssertEqual("fire", first.Mode, "First action mode");
            AssertEqual("TimelineBridge.PlayTimeline", first.HandlerName, "First action handler name");
            AssertEqual("start", first.NodeId, "First action node id");
            AssertEqual("line:2", first.LineId, "First action line id");
            AssertEqual(2, first.SourceLine, "First action source line");
            AssertEqual(1, first.SourceColumn, "First action source column");
            AssertEqual("@emit play_timeline \"mira_reveal\"", first.Raw, "First action raw");
            AssertEqual(1, first.Arguments.Count, "First action argument count");
            AssertEqual("mira_reveal", first.Arguments[0].Value.StringValue, "First action string argument");

            NarrativeRuntimeSnapshotModel snapshot = runtime.CreateSnapshot();
            AssertEqual(1, snapshot.ActionRequests.Count, "Runtime snapshot should expose fire action requests separately.");

            AssertTrue(runtime.AdvanceFlow(), "Runtime should advance after leading fire action.");
            AssertEqual(2, dispatchCount, "Runtime should dispatch fire action reached by flow advance.");
            AssertEqual(2, runtime.ActionRequests.Count, "Runtime should record second fire action request.");
            NarrativeRuntimeActionRequestModel second = runtime.ActionRequests[1];
            AssertEqual("action-2", second.RequestId, "Second action request id");
            AssertEqual("mark_checkpoint", second.Name, "Second action name");
            AssertEqual("RuntimeBridge.MarkCheckpoint", second.HandlerName, "Second action handler name");
            AssertEqual(3, second.Arguments.Count, "Second action argument count");
            AssertTrue(second.Arguments[0].Value.BoolValue, "Second action bool argument");
            AssertEqual(3, (int)second.Arguments[1].Value.NumberValue, "Second action number argument");
            AssertEqual("door-id", second.Arguments[2].Value.StringValue, "Second action identifier argument");

            AssertTrue(runtime.AdvanceFlow(), "Runtime should advance remaining content without redispatching fire actions.");
            AssertEqual(2, dispatchCount, "Runtime should not dispatch the same fire action twice in one node visit.");
            AssertTrue(runtime.Continue(), "Runtime should continue after fire actions.");
            AssertEqual("end", runtime.State.CurrentNodeName, "Runtime fire actions should not block default continue.");

            string serializedState = JsonSerializer.Serialize(runtime.ExportState("script-v1", "checkpoint-opaque-1"));
            AssertFalse(serializedState.Contains("actionRequests", StringComparison.OrdinalIgnoreCase), "Runtime export state should not include fire action request history.");
        }

        static void NarrativeRuntimeReportsActionDispatchErrors() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit open_window inventory_panel
Narrator: Start.
""");
            AssertFalse(compilation.HasErrors, "Action error fixture should compile.");

            NarrativeRuntime missingSchema = new NarrativeRuntime();
            missingSchema.LoadGraph(compilation.Document);
            AssertFalse(missingSchema.Start("start"), "Runtime should reject action missing Host Schema declaration.");
            AssertEqual("IRA001", missingSchema.LastError?.Code ?? string.Empty, "Runtime missing action schema error");

            NarrativeRuntime missingHandler = new NarrativeRuntime();
            missingHandler.LoadGraph(compilation.Document);
            missingHandler.ActionDispatcher.Actions.Add(CreateActionCapability("open_window", "fire"));
            AssertFalse(missingHandler.Start("start"), "Runtime should reject action missing Host Bridge handler.");
            AssertEqual("IRA002", missingHandler.LastError?.Code ?? string.Empty, "Runtime missing action handler error");

            NarrativeRuntime unsupportedMode = new NarrativeRuntime();
            unsupportedMode.LoadGraph(compilation.Document);
            unsupportedMode.ActionDispatcher.Actions.Add(CreateActionCapability("open_window", "handoff"));
            unsupportedMode.ActionDispatcher.Handlers.Add(CreateActionHandler("open_window", "UiBridge.OpenWindow"));
            AssertFalse(unsupportedMode.Start("start"), "Runtime should not treat handoff action as fire or wait in Round 6.");
            AssertEqual("IRA003", unsupportedMode.LastError?.Code ?? string.Empty, "Runtime unsupported action mode error");
            AssertEqual(0, unsupportedMode.ActionRequests.Count, "Unsupported action modes should not emit fire requests.");

            NarrativeRuntime hostError = new NarrativeRuntime();
            hostError.LoadGraph(compilation.Document);
            hostError.ActionDispatcher.Actions.Add(CreateActionCapability("open_window", "fire"));
            hostError.ActionDispatcher.Handlers.Add(CreateActionHandler("open_window", "UiBridge.OpenWindow"));
            hostError.ActionDispatcher.DispatchAction = _ => throw new InvalidOperationException("host refused");
            AssertFalse(hostError.Start("start"), "Runtime should report host fire action exceptions.");
            AssertEqual("IRA004", hostError.LastError?.Code ?? string.Empty, "Runtime host action exception error");
            AssertEqual(1, hostError.ActionRequests.Count, "Runtime should retain sent action request for host exception debugging.");
        }

        static void NarrativeRuntimeWaitsForActionResume() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit wait_for_ui confirm_help
Narrator: Resumed.
-> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Wait action fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.ActionDispatcher.Actions.Add(CreateActionCapability("wait_for_ui", "wait"));
            runtime.ActionDispatcher.Handlers.Add(CreateActionHandler("wait_for_ui", "UiBridge.WaitForUi"));
            int dispatchCount = 0;
            runtime.ActionDispatcher.DispatchAction = request => {
                dispatchCount += 1;
                AssertEqual("wait", request.Mode, "Wait action request mode");
                return new NarrativeRuntimeActionResultModel();
            };

            AssertTrue(runtime.Start("start"), "Runtime should enter pending state for leading wait action.");
            AssertEqual(1, dispatchCount, "Wait action dispatch count");
            AssertEqual(1, runtime.ActionRequests.Count, "Runtime should record sent wait action request.");
            AssertTrue(runtime.PendingAction != null, "Runtime should expose pending wait action.");
            AssertEqual("action-1", runtime.PendingAction?.RequestId ?? string.Empty, "Pending action request id");
            AssertEqual("wait_for_ui", runtime.PendingAction?.Name ?? string.Empty, "Pending action name");
            AssertEqual("wait", runtime.PendingAction?.Mode ?? string.Empty, "Pending action mode");
            AssertEqual("waiting", runtime.PendingAction?.Status ?? string.Empty, "Pending action status");
            AssertEqual("UiBridge.WaitForUi", runtime.PendingAction?.HandlerName ?? string.Empty, "Pending action handler");
            AssertEqual("confirm_help", runtime.PendingAction?.Arguments[0].Value.StringValue ?? string.Empty, "Pending action argument");

            NarrativeRuntimeSnapshotModel pendingSnapshot = runtime.CreateSnapshot();
            AssertTrue(pendingSnapshot.PendingAction != null, "Snapshot should expose pending action.");
            AssertFalse(pendingSnapshot.ReadingProgress.CanAdvance, "Pending action should block advancing.");
            string serializedPendingState = JsonSerializer.Serialize(runtime.ExportState("script-v1", "checkpoint-opaque-1"));
            AssertFalse(serializedPendingState.Contains("pendingAction", StringComparison.OrdinalIgnoreCase), "Formal Runtime State should not include pending action in Round 6.");
            AssertFalse(serializedPendingState.Contains("actionRequests", StringComparison.OrdinalIgnoreCase), "Formal Runtime State should not include action request history while pending.");
            AssertFalse(runtime.AdvanceFlow(), "Runtime should not advance while waiting for action resume.");
            AssertEqual("IRA005", runtime.LastError?.Code ?? string.Empty, "Pending action blocks advance error");

            AssertTrue(runtime.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-1",
                Status = "completed",
                HostPayload = "{\"ok\":true}",
            }), "Runtime should resume a completed wait action.");
            AssertTrue(runtime.PendingAction == null, "Completed resume should clear pending action.");
            AssertEqual(1, dispatchCount, "Runtime should not redispatch completed wait action.");

            NarrativeRuntimeSnapshotModel resumedSnapshot = runtime.CreateSnapshot();
            AssertTrue(resumedSnapshot.PendingAction == null, "Snapshot should clear pending action after resume.");
            AssertTrue(resumedSnapshot.ReadingProgress.CanAdvance, "Runtime should be advanceable after wait resume.");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should advance after wait action completes.");
            AssertTrue(runtime.Continue(), "Runtime should continue after resumed wait action.");
            AssertEqual("end", runtime.State.CurrentNodeName, "Runtime should reach end after wait resume.");
        }

        static void NarrativeRuntimeReportsWaitResumeErrors() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit wait_for_ui confirm_help
Narrator: Resumed.
""");
            AssertFalse(compilation.HasErrors, "Wait action error fixture should compile.");

            NarrativeRuntime wrongRequest = new NarrativeRuntime();
            wrongRequest.LoadGraph(compilation.Document);
            wrongRequest.ActionDispatcher.Actions.Add(CreateActionCapability("wait_for_ui", "wait"));
            wrongRequest.ActionDispatcher.Handlers.Add(CreateActionHandler("wait_for_ui", "UiBridge.WaitForUi"));
            AssertTrue(wrongRequest.Start("start"), "Runtime should enter pending state before wrong resume request.");
            AssertFalse(wrongRequest.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-other",
                Status = "completed",
            }), "Runtime should reject resume for a different request id.");
            AssertEqual("IRA006", wrongRequest.LastError?.Code ?? string.Empty, "Runtime wrong resume request error");
            AssertEqual("waiting", wrongRequest.PendingAction?.Status ?? string.Empty, "Wrong request should keep action waiting.");

            NarrativeRuntime hostError = new NarrativeRuntime();
            hostError.LoadGraph(compilation.Document);
            hostError.ActionDispatcher.Actions.Add(CreateActionCapability("wait_for_ui", "wait"));
            hostError.ActionDispatcher.Handlers.Add(CreateActionHandler("wait_for_ui", "UiBridge.WaitForUi"));
            AssertTrue(hostError.Start("start"), "Runtime should enter pending state before host error resume.");
            AssertFalse(hostError.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-1",
                Status = "cancelled",
                ErrorMessage = "host cancelled",
            }), "Runtime should report wait action cancellation as host action error.");
            AssertEqual("IRA007", hostError.LastError?.Code ?? string.Empty, "Runtime host action resume error");
            AssertEqual("cancelled", hostError.PendingAction?.Status ?? string.Empty, "Host error should retain failed pending evidence.");
        }

        static void NarrativeRuntimeExportsAndValidatesMinimalRuntimeState() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
""");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);

            AssertTrue(runtime.Start("start"), "Runtime should start before exporting state.");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal a line before exporting state.");
            string visibleLineAnchor = runtime.CurrentNode?.Lines[0].Anchor ?? string.Empty;

            NarrativeRuntimeExportStateModel state = runtime.ExportState("script-v1", "checkpoint-opaque-1");
            AssertEqual("inscape.runtime-state", state.Format, "Runtime export state format");
            AssertEqual(1, state.FormatVersion, "Runtime export state version");
            AssertEqual(NarrativeRuntime.CurrentRuntimeVersion, state.RuntimeVersion, "Runtime export runtime version");
            AssertEqual("script-v1", state.ScriptVersion, "Runtime export script version");
            AssertEqual("start", state.Position.NodeId, "Runtime export position node");
            AssertEqual(visibleLineAnchor, state.Position.LineId, "Runtime export position line");
            AssertEqual(1, state.Position.CommandIndex, "Runtime export command index");
            AssertEqual("start", state.Flow.EntryNodeId, "Runtime export entry node");
            AssertEqual(1, state.Flow.Stack.Count, "Runtime export flow stack count");
            AssertEqual(1, state.Facts.VisitedNodes.Count, "Runtime export facts visit count");
            AssertEqual("host", state.Random.Policy, "Runtime export random policy");
            AssertEqual("checkpoint-opaque-1", state.Host.CheckpointId, "Runtime export host checkpoint id");

            string serialized = JsonSerializer.Serialize(state);
            AssertFalse(serialized.Contains("rollback", StringComparison.OrdinalIgnoreCase), "Runtime export state should not include rollback stack.");
            AssertFalse(serialized.Contains("trace", StringComparison.OrdinalIgnoreCase), "Runtime export state should not include trace payload.");
            AssertFalse(serialized.Contains("log", StringComparison.OrdinalIgnoreCase), "Runtime export state should not include full log payload.");

            NarrativeRuntimeStateValidationModel compatible = runtime.ValidateStateAgainstCurrentScript(state, "script-v1");
            AssertEqual(NarrativeRuntimeStateValidationStatusModel.Compatible, compatible.Status, "Runtime state should validate as compatible.");
            AssertEqual(0, compatible.Diagnostics.Count, "Compatible runtime state diagnostics");

            NarrativeRuntimeExportStateModel migratable = runtime.ExportState("script-v1", "checkpoint-opaque-1");
            migratable.ScriptVersion = "script-v0";
            NarrativeRuntimeStateValidationModel migration = runtime.ValidateStateAgainstCurrentScript(migratable, "script-v1");
            AssertEqual(NarrativeRuntimeStateValidationStatusModel.Migratable, migration.Status, "Runtime state script drift should be migratable.");
            AssertTrue(ValidationContains(migration, "IRT006"), "Runtime validation should report script version drift.");

            NarrativeRuntimeExportStateModel incompatible = runtime.ExportState("script-v1", "checkpoint-opaque-1");
            incompatible.Position.NodeId = "missing.node";
            NarrativeRuntimeStateValidationModel invalid = runtime.ValidateStateAgainstCurrentScript(incompatible, "script-v1");
            AssertEqual(NarrativeRuntimeStateValidationStatusModel.Incompatible, invalid.Status, "Runtime state missing node should be incompatible.");
            AssertTrue(ValidationContains(invalid, "IRT007"), "Runtime validation should report missing current node.");
        }

        static void CliRuntimeProjectExportsAndValidatesFormalRuntimeState() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string statePath = Path.Combine(directory, "runtime-export-state.json");
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Start.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
""", Encoding.UTF8);

            try {
                string json = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--export-state",
                    "--script-version",
                    "script-v1",
                    "--host-checkpoint-id",
                    "checkpoint-opaque-1",
                });
                File.WriteAllText(statePath, json, Encoding.UTF8);

                using (JsonDocument document = JsonDocument.Parse(json)) {
                    JsonElement root = document.RootElement;
                    AssertEqual("inscape.runtime-state", root.GetProperty("format").GetString(), "Runtime export CLI format");
                    AssertEqual("script-v1", root.GetProperty("scriptVersion").GetString(), "Runtime export CLI script version");
                    AssertEqual("start", root.GetProperty("position").GetProperty("nodeId").GetString(), "Runtime export CLI node");
                    AssertEqual("checkpoint-opaque-1", root.GetProperty("host").GetProperty("checkpointId").GetString(), "Runtime export CLI checkpoint");
                }

                string compatibleJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-state",
                    statePath,
                    "--script-version",
                    "script-v1",
                });
                using (JsonDocument compatibleDocument = JsonDocument.Parse(compatibleJson)) {
                    AssertEqual("compatible", ReadLowerStatus(compatibleDocument), "Runtime validation CLI compatible status");
                }

                string migratableJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-state",
                    statePath,
                    "--script-version",
                    "script-v2",
                });
                using (JsonDocument migratableDocument = JsonDocument.Parse(migratableJson)) {
                    AssertEqual("migratable", ReadLowerStatus(migratableDocument), "Runtime validation CLI migratable status");
                }

                string restoredJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    statePath,
                    "--advance-flow",
                });
                using JsonDocument restoredDocument = JsonDocument.Parse(restoredJson);
                JsonElement restoredRoot = restoredDocument.RootElement;
                AssertEqual("start", restoredRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI restores exported state node");
                AssertEqual(1, restoredRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI restores exported state flow");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliRuntimeProjectEmitsRuntimeState() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Start.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
""", Encoding.UTF8);

            try {
                string json = RunCliForOutput(new[] { "runtime-project", directory });
                using JsonDocument document = JsonDocument.Parse(json);
                JsonElement root = document.RootElement;
                AssertEqual("inscape.runtime-state", root.GetProperty("format").GetString(), "Runtime CLI format");
                AssertEqual("start", root.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI current node");
                AssertEqual(0, root.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI visible step count");
                AssertEqual("start", root.GetProperty("currentNode").GetProperty("name").GetString(), "Runtime CLI current node payload");
                AssertEqual(1, root.GetProperty("readingProgress").GetProperty("contentStepCount").GetInt32(), "Runtime CLI reading content step count");
                AssertEqual(2, root.GetProperty("readingProgress").GetProperty("maxVisibleStepCount").GetInt32(), "Runtime CLI reading max step count");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliRuntimeProjectStepsRestoredState() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string statePath = Path.Combine(directory, "runtime-state.json");
            string choiceStatePath = Path.Combine(directory, "runtime-choice-state.json");
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Start.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
-> end.node

# end.node
Narrator: End.
""", Encoding.UTF8);

            try {
                string initialJson = RunCliForOutput(new[] { "runtime-project", directory });
                File.WriteAllText(statePath, initialJson, Encoding.UTF8);

                string advancedJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", statePath, "--advance-flow" });
                using (JsonDocument advancedDocument = JsonDocument.Parse(advancedJson)) {
                    JsonElement advancedRoot = advancedDocument.RootElement;
                    AssertEqual("start", advancedRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI flow advance current node");
                    AssertEqual(1, advancedRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI flow advance visible step count");
                }

                string choiceJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", statePath, "--choose", "0", "0" });
                using (JsonDocument choiceDocument = JsonDocument.Parse(choiceJson)) {
                    JsonElement choiceRoot = choiceDocument.RootElement;
                    AssertEqual("second.node", choiceRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI choice current node");
                    AssertEqual(2, choiceRoot.GetProperty("state").GetProperty("path").GetArrayLength(), "Runtime CLI choice path count");
                    AssertEqual(0, choiceRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI choice visible step count");
                }

                File.WriteAllText(choiceStatePath, choiceJson, Encoding.UTF8);
                string continueFlowJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", choiceStatePath, "--advance-flow" });
                using (JsonDocument continueFlowDocument = JsonDocument.Parse(continueFlowJson)) {
                    JsonElement continueFlowRoot = continueFlowDocument.RootElement;
                    AssertEqual("second.node", continueFlowRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI second-node flow advance current node");
                    AssertEqual(1, continueFlowRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI second-node flow advance visible step count");
                }

                string rewindJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", choiceStatePath, "--rewind" });
                using (JsonDocument rewindDocument = JsonDocument.Parse(rewindJson)) {
                    JsonElement rewindRoot = rewindDocument.RootElement;
                    AssertEqual("start", rewindRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI rewind current node");
                    AssertEqual(1, rewindRoot.GetProperty("state").GetProperty("path").GetArrayLength(), "Runtime CLI rewind path count");
                    AssertEqual(2, rewindRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI rewind visible step count");
                }

                string rewindFlowJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", rewindJsonToStatePath(directory, rewindJson), "--rewind-flow" });
                using (JsonDocument rewindFlowDocument = JsonDocument.Parse(rewindFlowJson)) {
                    JsonElement rewindFlowRoot = rewindFlowDocument.RootElement;
                    AssertEqual("start", rewindFlowRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI flow rewind current node");
                    AssertEqual(1, rewindFlowRoot.GetProperty("state").GetProperty("visibleStepCount").GetInt32(), "Runtime CLI flow rewind visible step count");
                }

                string continueJson = RunCliForOutput(new[] { "runtime-project", directory, "--state", choiceStatePath, "--continue" });
                using JsonDocument continueDocument = JsonDocument.Parse(continueJson);
                JsonElement continueRoot = continueDocument.RootElement;
                AssertEqual("end.node", continueRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI continue current node");
                AssertEqual(3, continueRoot.GetProperty("state").GetProperty("path").GetArrayLength(), "Runtime CLI continue path count");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static string rewindJsonToStatePath(string directory, string rewindJson) {
            string rewindStatePath = Path.Combine(directory, "runtime-rewind-state.json");
            File.WriteAllText(rewindStatePath, rewindJson, Encoding.UTF8);
            return rewindStatePath;
        }

        static NarrativeRuntimeQueryRequestModel CreateQueryRequest(string name, params string[] arguments) {
            NarrativeRuntimeQueryRequestModel request = new NarrativeRuntimeQueryRequestModel {
                Name = name,
            };
            for (int i = 0; i < arguments.Length; i += 1) {
                request.Arguments.Add(NarrativeRuntimeQueryValueModel.FromString(arguments[i]));
            }

            return request;
        }

        static NarrativeRuntimeQueryValueEntryModel CreateValueEntry(string name,
                                                                     string argument,
                                                                     NarrativeRuntimeQueryValueModel value) {
            return CreateValueEntry(name, value, NarrativeRuntimeQueryValueModel.FromString(argument));
        }

        static NarrativeRuntimeQueryValueEntryModel CreateValueEntry(string name,
                                                                     NarrativeRuntimeQueryValueModel value,
                                                                     params NarrativeRuntimeQueryValueModel[] arguments) {
            NarrativeRuntimeQueryValueEntryModel entry = new NarrativeRuntimeQueryValueEntryModel {
                Name = name,
                Value = value,
            };
            for (int i = 0; i < arguments.Length; i += 1) {
                entry.Arguments.Add(arguments[i]);
            }
            return entry;
        }

        static NarrativeRuntimeActionCapabilityModel CreateActionCapability(string name, string mode) {
            return new NarrativeRuntimeActionCapabilityModel {
                Name = name,
                Mode = mode,
            };
        }

        static NarrativeRuntimeActionHandlerBindingModel CreateActionHandler(string name, string handlerName) {
            return new NarrativeRuntimeActionHandlerBindingModel {
                Name = name,
                HandlerName = handlerName,
            };
        }

        static DslScriptConditionExpressionModel ReadChoiceConditionExpression(string condition) {
            DslScriptCompilationResultModel compilation = Compile($"""
# start
? Choose
- [{condition}] Option -> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Condition evaluator fixture should compile.");

            DslScriptConditionExpressionModel? expression = compilation.Document
                .Nodes[0]
                .Choices[0]
                .Options[0]
                .Condition
                ?.Expression;
            if (expression == null) {
                throw new InvalidOperationException("Condition evaluator fixture did not produce condition IR.");
            }

            return expression;
        }

        static string FirstConditionDiagnosticCode(NarrativeRuntimeConditionEvaluationModel evaluation) {
            return evaluation.Diagnostics.Count > 0 ? evaluation.Diagnostics[0].Code : string.Empty;
        }

        static bool ValidationContains(NarrativeRuntimeStateValidationModel validation, string code) {
            for (int i = 0; i < validation.Diagnostics.Count; i += 1) {
                if (validation.Diagnostics[i].Code == code) {
                    return true;
                }
            }

            return false;
        }

        static string ReadLowerStatus(JsonDocument document) {
            return (document.RootElement.GetProperty("status").GetString() ?? string.Empty).ToLowerInvariant();
        }

    }

}
