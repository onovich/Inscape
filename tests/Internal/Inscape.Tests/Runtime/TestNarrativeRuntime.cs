using Inscape.Compiler.Compilation;
using Inscape.Runtime;

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

    }

}
