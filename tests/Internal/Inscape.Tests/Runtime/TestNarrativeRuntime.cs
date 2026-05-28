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

    }

}
