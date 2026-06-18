namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeLogEntryModel {

        public int Sequence { get; set; }

        public string NodeId { get; set; }

        public string LineId { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public NarrativeRuntimeLogEntryModel() {
            NodeId = string.Empty;
            LineId = string.Empty;
            Speaker = string.Empty;
            Text = string.Empty;
        }

    }

}
