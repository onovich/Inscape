using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeExportStateModel {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public string RuntimeVersion { get; set; }

        public string ScriptVersion { get; set; }

        public NarrativeRuntimeStatePositionModel Position { get; set; }

        public NarrativeRuntimeStateFlowModel Flow { get; set; }

        public NarrativeRuntimeFactsModel Facts { get; set; }

        public NarrativeRuntimeStateRandomModel Random { get; set; }

        public NarrativeRuntimeStateHostModel Host { get; set; }

        public NarrativeRuntimeExportStateModel() {
            Format = "inscape.runtime-state";
            FormatVersion = 1;
            RuntimeVersion = NarrativeRuntime.CurrentRuntimeVersion;
            ScriptVersion = string.Empty;
            Position = new NarrativeRuntimeStatePositionModel();
            Flow = new NarrativeRuntimeStateFlowModel();
            Facts = new NarrativeRuntimeFactsModel();
            Random = new NarrativeRuntimeStateRandomModel();
            Host = new NarrativeRuntimeStateHostModel();
        }

    }

    public sealed class NarrativeRuntimeStatePositionModel {

        public string NodeId { get; set; }

        public string LineId { get; set; }

        public int CommandIndex { get; set; }

        public NarrativeRuntimeStatePositionModel() {
            NodeId = string.Empty;
            LineId = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeStateFlowModel {

        public string EntryNodeId { get; set; }

        public List<string> Stack { get; set; }

        public NarrativeRuntimeStateFlowModel() {
            EntryNodeId = string.Empty;
            Stack = new List<string>();
        }

    }

    public sealed class NarrativeRuntimeStateRandomModel {

        public string Policy { get; set; }

        public string Seed { get; set; }

        public string State { get; set; }

        public NarrativeRuntimeStateRandomModel() {
            Policy = "host";
            Seed = string.Empty;
            State = string.Empty;
        }

    }

    public sealed class NarrativeRuntimeStateHostModel {

        public string CheckpointId { get; set; }

        public NarrativeRuntimeStateHostModel() {
            CheckpointId = string.Empty;
        }

    }

}
