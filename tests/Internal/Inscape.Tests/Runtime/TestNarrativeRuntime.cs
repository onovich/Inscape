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
            AssertTrue(runtime.Choose(0, 0), "Runtime should choose a valid option.");
            AssertEqual("second.node", runtime.State.CurrentNodeName, "Runtime current node after choice");
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
                AssertEqual("start", root.GetProperty("currentNode").GetProperty("name").GetString(), "Runtime CLI current node payload");
            } finally {
                Directory.Delete(directory, true);
            }
        }

    }

}
