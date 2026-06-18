using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeSnapshotModel {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public NarrativeRuntimeStateModel State { get; set; }

        public StoryGraphNodeModel? CurrentNode { get; set; }

        public NarrativeRuntimeReadingProgressModel ReadingProgress { get; set; }

        public NarrativeRuntimeFlowErrorModel? LastError { get; set; }

        public NarrativeRuntimeSnapshotModel() {
            Format = "inscape.runtime-state";
            FormatVersion = 1;
            State = new NarrativeRuntimeStateModel();
            ReadingProgress = new NarrativeRuntimeReadingProgressModel();
        }

    }

}
