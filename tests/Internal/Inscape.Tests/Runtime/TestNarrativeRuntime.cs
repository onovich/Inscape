using Inscape.Compiler.Compilation;
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
            NarrativeRuntimeQueryValueEntryModel entry = new NarrativeRuntimeQueryValueEntryModel {
                Name = name,
                Value = value,
            };
            entry.Arguments.Add(NarrativeRuntimeQueryValueModel.FromString(argument));
            return entry;
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
