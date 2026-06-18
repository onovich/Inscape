using Inscape.Compiler.Compilation;
using Inscape.Compiler.Model;
using Inscape.Runtime;
using System.Collections.Generic;
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

        static void NarrativeRuntimeRecordsDisplayedTextLog() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@entry
Narrator: Start.
Mira: Hello.
? Next
  - Go second -> second.node

# second.node
Narrator: Second.
""");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);

            AssertTrue(runtime.Start("start"), "Runtime should start before recording log entries.");
            AssertEqual(0, runtime.LogEntries.Count, "Runtime should not log node entry or metadata.");

            string firstLineAnchor = runtime.CurrentNode?.Lines[1].Anchor ?? string.Empty;
            string secondLineAnchor = runtime.CurrentNode?.Lines[2].Anchor ?? string.Empty;

            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the first content line.");
            AssertEqual(1, runtime.LogEntries.Count, "Runtime should log the first displayed line.");
            AssertEqual(1, runtime.LogEntries[0].Sequence, "First log entry sequence");
            AssertEqual("start", runtime.LogEntries[0].NodeId, "First log entry node");
            AssertEqual(firstLineAnchor, runtime.LogEntries[0].LineId, "First log entry line id");
            AssertEqual("Narrator", runtime.LogEntries[0].Speaker, "First log entry speaker");
            AssertEqual("Start.", runtime.LogEntries[0].Text, "First log entry text");

            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the second content line.");
            AssertEqual(2, runtime.LogEntries.Count, "Runtime should log the second displayed line.");
            AssertEqual(2, runtime.LogEntries[1].Sequence, "Second log entry sequence");
            AssertEqual(secondLineAnchor, runtime.LogEntries[1].LineId, "Second log entry line id");
            AssertEqual("Mira", runtime.LogEntries[1].Speaker, "Second log entry speaker");
            AssertEqual("Hello.", runtime.LogEntries[1].Text, "Second log entry text");

            NarrativeRuntimeSnapshotModel firstSnapshot = runtime.CreateSnapshot();
            NarrativeRuntimeSnapshotModel secondSnapshot = runtime.CreateSnapshot();
            AssertEqual(2, firstSnapshot.LogEntries.Count, "Snapshot should expose log entries.");
            AssertEqual(2, secondSnapshot.LogEntries.Count, "Snapshot should not create extra log entries.");

            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the choice stage without logging choice text.");
            AssertEqual(2, runtime.LogEntries.Count, "Choice stage should not enter the default player log.");

            string serializedState = JsonSerializer.Serialize(runtime.ExportState("script-v1", "checkpoint-opaque-1"));
            AssertFalse(serializedState.Contains("log", StringComparison.OrdinalIgnoreCase), "Formal Runtime State should not include log entries.");

            NarrativeRuntime restored = new NarrativeRuntime();
            restored.LoadGraph(compilation.Document);
            AssertTrue(restored.Restore(runtime.CreateSnapshot().State), "Minimal state restore should remain valid after log recording.");
            AssertEqual(0, restored.LogEntries.Count, "Minimal state restore should not restore transient log entries.");
        }

        static void NarrativeRuntimeLogSkipsHiddenConditionalText() {
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
            AssertFalse(compilation.HasErrors, "Conditional log fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("has_item",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(false),
                                                                  NarrativeRuntimeQueryValueModel.FromString("silver_key")));

            AssertTrue(runtime.Start("start"), "Runtime should start conditional log fixture.");
            AssertEqual(0, runtime.LogEntries.Count, "Runtime should not log hidden choice text.");
            AssertTrue(runtime.Choose(0, 0), "Runtime should choose the only visible option.");
            AssertEqual("gate.knock", runtime.State.CurrentNodeName, "Runtime should enter visible choice target.");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the chosen branch line.");

            AssertEqual(1, runtime.LogEntries.Count, "Runtime should log only displayed branch text.");
            AssertEqual("gate.knock", runtime.LogEntries[0].NodeId, "Conditional log entry node");
            AssertEqual("Knock.", runtime.LogEntries[0].Text, "Conditional log entry text");
            AssertFalse(LogContainsText(runtime.LogEntries, "Open."), "Hidden conditional branch text should not enter log.");
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
            unsupportedMode.ActionDispatcher.Actions.Add(CreateActionCapability("open_window", "teleport"));
            unsupportedMode.ActionDispatcher.Handlers.Add(CreateActionHandler("open_window", "UiBridge.OpenWindow"));
            AssertFalse(unsupportedMode.Start("start"), "Runtime should reject unsupported action modes.");
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

        static void NarrativeRuntimeHandsOffAndResumes() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit enter_host_segment segment_alpha
Narrator: Returned.
-> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Handoff action fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.ActionDispatcher.Actions.Add(CreateActionCapability("enter_host_segment", "handoff"));
            runtime.ActionDispatcher.Handlers.Add(CreateActionHandler("enter_host_segment", "HostFlowBridge.EnterSegment"));
            int dispatchCount = 0;
            runtime.ActionDispatcher.DispatchAction = request => {
                dispatchCount += 1;
                AssertEqual("handoff", request.Mode, "Handoff action request mode");
                AssertEqual("HostFlowBridge.EnterSegment", request.HandlerName, "Handoff action handler");
                return new NarrativeRuntimeActionResultModel {
                    Status = "completed",
                    HostPayload = "{\"segment\":\"segment_alpha\"}",
                };
            };

            AssertTrue(runtime.Start("start"), "Runtime should enter pending state for leading handoff action.");
            AssertEqual(1, dispatchCount, "Handoff action dispatch count");
            AssertEqual(1, runtime.ActionRequests.Count, "Runtime should record sent handoff action request.");
            AssertTrue(runtime.PendingAction != null, "Runtime should expose pending handoff action.");
            AssertEqual("action-1", runtime.PendingAction?.RequestId ?? string.Empty, "Pending handoff request id");
            AssertEqual("enter_host_segment", runtime.PendingAction?.Name ?? string.Empty, "Pending handoff name");
            AssertEqual("handoff", runtime.PendingAction?.Mode ?? string.Empty, "Pending handoff mode");
            AssertEqual("waiting", runtime.PendingAction?.Status ?? string.Empty, "Pending handoff status");
            AssertEqual("HostFlowBridge.EnterSegment", runtime.PendingAction?.HandlerName ?? string.Empty, "Pending handoff handler");
            AssertEqual("segment_alpha", runtime.PendingAction?.Arguments[0].Value.StringValue ?? string.Empty, "Pending handoff argument");

            NarrativeRuntimeSnapshotModel pendingSnapshot = runtime.CreateSnapshot();
            AssertTrue(pendingSnapshot.PendingAction != null, "Snapshot should expose pending handoff action.");
            AssertFalse(pendingSnapshot.ReadingProgress.CanAdvance, "Handoff action should block advancing.");
            string serializedPendingState = JsonSerializer.Serialize(runtime.ExportState("script-v1", "checkpoint-opaque-1"));
            AssertFalse(serializedPendingState.Contains("pendingAction", StringComparison.OrdinalIgnoreCase), "Formal Runtime State should not include handoff pending action.");
            AssertFalse(runtime.Continue(), "Runtime should not continue while handoff controls flow.");
            AssertEqual("IRA005", runtime.LastError?.Code ?? string.Empty, "Pending handoff blocks continue error");

            AssertTrue(runtime.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-1",
                Status = "completed",
                HostPayload = "{\"result\":\"done\"}",
            }), "Runtime should resume a completed handoff action.");
            AssertTrue(runtime.PendingAction == null, "Completed handoff resume should clear pending action.");
            AssertEqual(1, dispatchCount, "Runtime should not redispatch completed handoff action.");

            AssertTrue(runtime.AdvanceFlow(), "Runtime should advance after handoff action completes.");
            AssertTrue(runtime.Continue(), "Runtime should continue after resumed handoff action.");
            AssertEqual("end", runtime.State.CurrentNodeName, "Runtime should reach end after handoff resume.");
        }

        static void NarrativeRuntimeReportsHandoffResumeErrors() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit enter_host_segment segment_alpha
Narrator: Returned.
""");
            AssertFalse(compilation.HasErrors, "Handoff action error fixture should compile.");

            NarrativeRuntime hostError = new NarrativeRuntime();
            hostError.LoadGraph(compilation.Document);
            hostError.ActionDispatcher.Actions.Add(CreateActionCapability("enter_host_segment", "handoff"));
            hostError.ActionDispatcher.Handlers.Add(CreateActionHandler("enter_host_segment", "HostFlowBridge.EnterSegment"));
            AssertTrue(hostError.Start("start"), "Runtime should enter pending state before handoff host error resume.");
            AssertFalse(hostError.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-1",
                Status = "timeout",
                ErrorCode = "host-timeout",
            }), "Runtime should report handoff timeout as host action error.");
            AssertEqual("IRA007", hostError.LastError?.Code ?? string.Empty, "Runtime handoff resume error");
            AssertEqual("handoff", hostError.PendingAction?.Mode ?? string.Empty, "Host error should retain handoff mode.");
            AssertEqual("timeout", hostError.PendingAction?.Status ?? string.Empty, "Host error should retain failed handoff evidence.");
            AssertFalse(hostError.AdvanceFlow(), "Runtime should stay blocked after handoff host error.");
            AssertEqual("IRA005", hostError.LastError?.Code ?? string.Empty, "Failed handoff pending blocks advance error");
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

        static void NarrativeRuntimeExportsImportsSubstateAndContinues() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
? [gate_ready()] -> gate.open
-> gate.locked

# gate.open
Narrator: Open.
-> end

# gate.locked
Narrator: Locked.
-> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Runtime substate fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.QueryProvider = new NarrativeRuntimeQueryProviderModel {
                Kind = NarrativeRuntimeQueryProviderKindModel.Mock,
            };
            runtime.QueryProvider.MockValues.Add(CreateValueEntry("gate_ready",
                                                                  NarrativeRuntimeQueryValueModel.FromBool(false)));

            AssertTrue(runtime.Start("start"), "Runtime should start before exporting substate.");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal the start line before branch.");
            AssertTrue(runtime.Continue(), "Runtime should follow fallback branch before exporting substate.");
            AssertTrue(runtime.AdvanceFlow(), "Runtime should reveal fallback branch line before exporting substate.");

            NarrativeRuntimeSubstateModel substate = runtime.ExportSubstate("script-v1", "opaque-host-checkpoint-1");
            AssertEqual("inscape.runtime-substate", substate.Format, "Runtime substate format");
            AssertEqual(1, substate.FormatVersion, "Runtime substate version");
            AssertEqual(NarrativeRuntime.CurrentRuntimeVersion, substate.RuntimeVersion, "Runtime substate runtime version");
            AssertEqual("script-v1", substate.ScriptVersion, "Runtime substate script version");
            AssertEqual("gate.locked", substate.Position.NodeId, "Runtime substate current node");
            AssertEqual(1, substate.Position.CommandIndex, "Runtime substate command index");
            AssertEqual(2, substate.Flow.Stack.Count, "Runtime substate flow stack count");
            AssertEqual(2, substate.Facts.VisitedNodes.Count, "Runtime substate facts should be cloned.");
            AssertEqual(1, substate.BranchQueryReceipts.Count, "Runtime substate should preserve branch query receipts.");
            AssertTrue(substate.PendingAction == null, "Runtime substate should omit pending action when no action is pending.");
            AssertEqual("opaque-host-checkpoint-1", substate.Host.CheckpointId, "Runtime substate host checkpoint id is opaque.");

            string serializedSubstate = JsonSerializer.Serialize(substate);
            AssertFalse(serializedSubstate.Contains("log", StringComparison.OrdinalIgnoreCase), "Runtime substate should not include full log entries.");
            AssertFalse(serializedSubstate.Contains("actionRequests", StringComparison.OrdinalIgnoreCase), "Runtime substate should not include action request history.");
            AssertFalse(serializedSubstate.Contains("inventory", StringComparison.OrdinalIgnoreCase), "Runtime substate should not include host inventory state.");

            NarrativeRuntime restored = new NarrativeRuntime();
            restored.LoadGraph(compilation.Document);
            AssertTrue(restored.ImportSubstate(substate, "script-v1"), "Runtime should import a compatible substate.");
            AssertEqual("gate.locked", restored.State.CurrentNodeName, "Imported substate current node");
            AssertEqual(1, restored.State.VisibleStepCount, "Imported substate command index");
            AssertEqual(1, restored.BranchQueryReceipts.Count, "Imported substate should restore branch query receipts.");
            AssertEqual(0, restored.LogEntries.Count, "Imported substate should not restore full log entries.");
            AssertTrue(restored.Continue(), "Runtime should continue after importing substate.");
            AssertEqual("end", restored.State.CurrentNodeName, "Runtime should reach end after import and continue.");
        }

        static void NarrativeRuntimeImportsPendingSubstateAndResumes() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
@emit wait_for_ui confirm_help
Narrator: Resumed.
-> end

# end
Narrator: End.
""");
            AssertFalse(compilation.HasErrors, "Runtime pending substate fixture should compile.");

            NarrativeRuntime runtime = new NarrativeRuntime();
            runtime.LoadGraph(compilation.Document);
            runtime.ActionDispatcher.Actions.Add(CreateActionCapability("wait_for_ui", "wait"));
            runtime.ActionDispatcher.Handlers.Add(CreateActionHandler("wait_for_ui", "UiBridge.WaitForUi"));
            AssertTrue(runtime.Start("start"), "Runtime should enter pending state before exporting substate.");

            NarrativeRuntimeSubstateModel substate = runtime.ExportSubstate("script-v1", "checkpoint-pending-1");
            AssertTrue(substate.PendingAction != null, "Runtime substate should include pending action.");
            AssertEqual("action-1", substate.PendingAction?.RequestId ?? string.Empty, "Runtime substate pending request id");
            AssertEqual("wait", substate.PendingAction?.Mode ?? string.Empty, "Runtime substate pending mode");
            AssertEqual("checkpoint-pending-1", substate.Host.CheckpointId, "Runtime substate pending checkpoint id");

            int dispatchCount = 0;
            NarrativeRuntime restored = new NarrativeRuntime();
            restored.LoadGraph(compilation.Document);
            restored.ActionDispatcher.Actions.Add(CreateActionCapability("wait_for_ui", "wait"));
            restored.ActionDispatcher.Handlers.Add(CreateActionHandler("wait_for_ui", "UiBridge.WaitForUi"));
            restored.ActionDispatcher.DispatchAction = _ => {
                dispatchCount += 1;
                return new NarrativeRuntimeActionResultModel();
            };

            AssertTrue(restored.ImportSubstate(substate, "script-v1"), "Runtime should import pending substate.");
            AssertTrue(restored.PendingAction != null, "Imported substate should restore pending action.");
            AssertEqual(0, dispatchCount, "Importing substate should not dispatch host actions.");
            AssertTrue(restored.ResumeAction(new NarrativeRuntimeActionResumeModel {
                RequestId = "action-1",
                Status = "completed",
            }), "Runtime should resume imported pending action.");
            AssertEqual(0, dispatchCount, "Resuming imported pending action should not redispatch the completed action.");
            AssertTrue(restored.AdvanceFlow(), "Runtime should advance after imported pending action resumes.");
        }

        static void NarrativeRuntimeRejectsMigratableSubstateWithoutRepair() {
            DslScriptCompilationResultModel compilation = Compile("""
# start
Narrator: Start.
""");

            NarrativeRuntime source = new NarrativeRuntime();
            source.LoadGraph(compilation.Document);
            AssertTrue(source.Start("start"), "Runtime should start before exporting drifted substate.");
            NarrativeRuntimeSubstateModel substate = source.ExportSubstate("script-v0", "checkpoint-drifted");

            NarrativeRuntime restored = new NarrativeRuntime();
            restored.LoadGraph(compilation.Document);
            NarrativeRuntimeStateValidationModel validation = restored.ValidateSubstateAgainstCurrentScript(substate, "script-v1");
            AssertEqual(NarrativeRuntimeStateValidationStatusModel.Migratable, validation.Status, "Substate script drift should be migratable.");
            AssertTrue(ValidationContains(validation, "IRT006"), "Substate validation should report script drift.");

            AssertFalse(restored.ImportSubstate(substate, "script-v1"), "Runtime should not import migratable substate by guessing repairs.");
            AssertEqual("IRT011", restored.LastError?.Code ?? string.Empty, "Runtime import incompatible substate error");
            AssertEqual(string.Empty, restored.State.CurrentNodeName, "Rejected substate import should not repair current node.");
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

        static void CliRuntimeProjectDrivesP4PlayableRuntime() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string initialPath = Path.Combine(directory, "runtime-initial.json");
            string pendingSubstatePath = Path.Combine(directory, "runtime-pending-substate.json");
            string resumedSubstatePath = Path.Combine(directory, "runtime-resumed-substate.json");
            string advancedSubstatePath = Path.Combine(directory, "runtime-advanced-substate.json");
            string queryProviderPath = Path.Combine(directory, "runtime-query-provider.json");
            string keyQueryProviderPath = Path.Combine(directory, "runtime-key-query-provider.json");
            string actionDispatcherPath = Path.Combine(directory, "runtime-action-dispatcher.json");
            string resumePath = Path.Combine(directory, "runtime-resume.json");

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Door.
? Gate
- [has_item("silver_key")] Use key -> gate.open
- Knock -> gate.knock

# gate.open
@emit play_timeline mira_reveal
Narrator: Door opens.
-> end

# gate.knock
@emit wait_for_ui confirm_help
Narrator: Knocked.
? [visited("gate.knock") and trust("mira") >= 3] -> mira.help
-> gate.locked

# mira.help
Narrator: Mira helps.
-> end

# gate.locked
Narrator: Locked.
-> end

# end
Narrator: End.
""", Encoding.UTF8);

            File.WriteAllText(queryProviderPath, """
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "has_item",
      "arguments": [
        { "kind": "String", "stringValue": "silver_key" }
      ],
      "value": { "kind": "Bool", "boolValue": false }
    },
    {
      "name": "trust",
      "arguments": [
        { "kind": "String", "stringValue": "mira" }
      ],
      "value": { "kind": "Number", "numberValue": 4 }
    }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(keyQueryProviderPath, """
{
  "kind": "Mock",
  "mockValues": [
    {
      "name": "has_item",
      "arguments": [
        { "kind": "String", "stringValue": "silver_key" }
      ],
      "value": { "kind": "Bool", "boolValue": true }
    }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(actionDispatcherPath, """
{
  "actions": [
    { "name": "play_timeline", "mode": "fire" },
    { "name": "wait_for_ui", "mode": "wait" }
  ],
  "handlers": [
    { "name": "play_timeline", "handlerName": "Timeline.Play" },
    { "name": "wait_for_ui", "handlerName": "Ui.WaitForUi" }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(resumePath, """
{
  "requestId": "action-1",
  "status": "completed",
  "hostPayload": "{\"confirmed\":true}"
}
""", Encoding.UTF8);

            try {
                string fireJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    keyQueryProviderPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--choose",
                    "0",
                    "0",
                });
                using (JsonDocument fireDocument = JsonDocument.Parse(fireJson)) {
                    JsonElement fireRoot = fireDocument.RootElement;
                    AssertEqual("gate.open", fireRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI fire path current node");
                    AssertEqual(1, fireRoot.GetProperty("actionRequests").GetArrayLength(), "Runtime CLI fire action request count");
                    AssertEqual("play_timeline", fireRoot.GetProperty("actionRequests")[0].GetProperty("name").GetString(), "Runtime CLI fire action name");
                    AssertEqual("fire", fireRoot.GetProperty("actionRequests")[0].GetProperty("mode").GetString(), "Runtime CLI fire action mode");
                    AssertEqual(JsonValueKind.Null, fireRoot.GetProperty("pendingAction").ValueKind, "Runtime CLI fire should not create pending action");
                }

                string initialJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    queryProviderPath,
                });
                File.WriteAllText(initialPath, initialJson, Encoding.UTF8);
                using (JsonDocument initialDocument = JsonDocument.Parse(initialJson)) {
                    JsonElement initialRoot = initialDocument.RootElement;
                    AssertEqual(1, initialRoot.GetProperty("currentNode").GetProperty("choices")[0].GetProperty("options").GetArrayLength(), "Runtime CLI should filter invisible choice.");
                    AssertEqual("Knock", initialRoot.GetProperty("currentNode").GetProperty("choices")[0].GetProperty("options")[0].GetProperty("text").GetString(), "Runtime CLI visible choice text");
                    AssertEqual(1, initialRoot.GetProperty("branchQueryReceipts").GetArrayLength(), "Runtime CLI initial choice receipt count");
                }

                string pendingSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--state",
                    initialPath,
                    "--query-provider",
                    queryProviderPath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--choose",
                    "0",
                    "0",
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                    "--host-checkpoint-id",
                    "checkpoint-p4",
                });
                File.WriteAllText(pendingSubstatePath, pendingSubstateJson, Encoding.UTF8);
                using (JsonDocument pendingDocument = JsonDocument.Parse(pendingSubstateJson)) {
                    JsonElement pendingRoot = pendingDocument.RootElement;
                    AssertEqual("inscape.runtime-substate", pendingRoot.GetProperty("format").GetString(), "Runtime CLI substate format");
                    AssertEqual("gate.knock", pendingRoot.GetProperty("position").GetProperty("nodeId").GetString(), "Runtime CLI pending substate node");
                    AssertEqual("wait_for_ui", pendingRoot.GetProperty("pendingAction").GetProperty("name").GetString(), "Runtime CLI pending action name");
                    AssertEqual("wait", pendingRoot.GetProperty("pendingAction").GetProperty("mode").GetString(), "Runtime CLI pending action mode");
                    AssertEqual("checkpoint-p4", pendingRoot.GetProperty("host").GetProperty("checkpointId").GetString(), "Runtime CLI substate checkpoint");
                    AssertEqual(1, pendingRoot.GetProperty("branchQueryReceipts").GetArrayLength(), "Runtime CLI substate should preserve branch receipt.");
                }

                string validationJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--validate-substate",
                    pendingSubstatePath,
                    "--script-version",
                    "script-v1",
                });
                using (JsonDocument validationDocument = JsonDocument.Parse(validationJson)) {
                    AssertEqual("compatible", ReadLowerStatus(validationDocument), "Runtime CLI substate validation status");
                }

                string resumedSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    pendingSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--resume-action",
                    resumePath,
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                });
                File.WriteAllText(resumedSubstatePath, resumedSubstateJson, Encoding.UTF8);
                using (JsonDocument resumedDocument = JsonDocument.Parse(resumedSubstateJson)) {
                    JsonElement resumedRoot = resumedDocument.RootElement;
                    AssertEqual(JsonValueKind.Null, resumedRoot.GetProperty("pendingAction").ValueKind, "Runtime CLI resumed substate pending action");
                    AssertEqual("gate.knock", resumedRoot.GetProperty("position").GetProperty("nodeId").GetString(), "Runtime CLI resumed substate node");
                }

                string logJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    resumedSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--advance-flow",
                });
                using (JsonDocument logDocument = JsonDocument.Parse(logJson)) {
                    JsonElement logRoot = logDocument.RootElement;
                    AssertEqual(1, logRoot.GetProperty("logEntries").GetArrayLength(), "Runtime CLI log entry count");
                    AssertEqual("Knocked.", logRoot.GetProperty("logEntries")[0].GetProperty("text").GetString(), "Runtime CLI log entry text");
                    AssertEqual(0, logRoot.GetProperty("actionRequests").GetArrayLength(), "Runtime CLI substate import should not redispatch completed pending action.");
                }

                string advancedSubstateJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    resumedSubstatePath,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--advance-flow",
                    "--export-substate",
                    "--script-version",
                    "script-v1",
                });
                File.WriteAllText(advancedSubstatePath, advancedSubstateJson, Encoding.UTF8);

                string helpJson = RunCliForOutput(new[] {
                    "runtime-project",
                    directory,
                    "--substate",
                    advancedSubstatePath,
                    "--query-provider",
                    queryProviderPath,
                    "--continue",
                });
                using JsonDocument helpDocument = JsonDocument.Parse(helpJson);
                JsonElement helpRoot = helpDocument.RootElement;
                AssertEqual("mira.help", helpRoot.GetProperty("state").GetProperty("currentNodeName").GetString(), "Runtime CLI should continue through internal fact and query condition.");
                AssertTrue(RuntimeSnapshotHasReceipt(helpRoot, "trust"), "Runtime CLI conditional jump should record host query receipt.");
                AssertTrue(RuntimeSnapshotHasReceipt(helpRoot, "visited"), "Runtime CLI conditional jump should record internal fact receipt.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliRuntimeProjectReportsP4RuntimeQueryErrors() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string queryProviderPath = Path.Combine(directory, "runtime-query-provider.json");
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Start.
? [trust("mira") >= 3] -> mira.help
-> gate.locked

# mira.help
Narrator: Help.

# gate.locked
Narrator: Locked.
""", Encoding.UTF8);

            File.WriteAllText(queryProviderPath, """
{
  "kind": "Mock",
  "mockValues": []
}
""", Encoding.UTF8);

            try {
                (int ExitCode, string Stdout, string Stderr) result = RunCliForFailure(new[] {
                    "runtime-project",
                    directory,
                    "--query-provider",
                    queryProviderPath,
                    "--continue",
                });

                AssertEqual(1, result.ExitCode, "Runtime CLI query failure exit code");
                AssertEqual(string.Empty, result.Stdout.Trim(), "Runtime CLI query failure stdout");
                AssertTrue(result.Stderr.Contains("IRF005"), "Runtime CLI query failure should include flow error code.");
                AssertTrue(result.Stderr.Contains("IRC003"), "Runtime CLI query failure should include condition diagnostic code.");
                AssertTrue(result.Stderr.Contains("conditionalJumps[0].condition"), "Runtime CLI query failure should include branch path.");
                AssertTrue(result.Stderr.Contains("trust"), "Runtime CLI query failure should include query name.");
            } finally {
                Directory.Delete(directory, true);
            }
        }

        static void CliRuntimeProjectReportsP4RuntimeActionResultErrors() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);
            string actionDispatcherPath = Path.Combine(directory, "runtime-action-dispatcher.json");
            string actionResultPath = Path.Combine(directory, "runtime-action-result.json");
            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
@emit play_timeline mira_reveal
Narrator: Start.
""", Encoding.UTF8);

            File.WriteAllText(actionDispatcherPath, """
{
  "actions": [
    { "name": "play_timeline", "mode": "fire" }
  ],
  "handlers": [
    { "name": "play_timeline", "handlerName": "Timeline.Play" }
  ]
}
""", Encoding.UTF8);

            File.WriteAllText(actionResultPath, """
{
  "succeeded": false,
  "status": "failed",
  "errorCode": "HOST001",
  "errorMessage": "Timeline failed."
}
""", Encoding.UTF8);

            try {
                (int ExitCode, string Stdout, string Stderr) result = RunCliForFailure(new[] {
                    "runtime-project",
                    directory,
                    "--action-dispatcher",
                    actionDispatcherPath,
                    "--action-result",
                    actionResultPath,
                });

                AssertEqual(1, result.ExitCode, "Runtime CLI action failure exit code");
                AssertEqual(string.Empty, result.Stdout.Trim(), "Runtime CLI action failure stdout");
                AssertTrue(result.Stderr.Contains("HOST001"), "Runtime CLI action failure should include host error code.");
                AssertTrue(result.Stderr.Contains("action.play_timeline"), "Runtime CLI action failure should include action path.");
                AssertTrue(result.Stderr.Contains("Timeline failed."), "Runtime CLI action failure should include host error message.");
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

        static bool LogContainsText(IReadOnlyList<NarrativeRuntimeLogEntryModel> entries, string text) {
            for (int i = 0; i < entries.Count; i += 1) {
                if (entries[i].Text == text) {
                    return true;
                }
            }

            return false;
        }

        static bool RuntimeSnapshotHasReceipt(JsonElement snapshot, string name) {
            foreach (JsonElement receipt in snapshot.GetProperty("branchQueryReceipts").EnumerateArray()) {
                if (receipt.GetProperty("name").GetString() == name) {
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
