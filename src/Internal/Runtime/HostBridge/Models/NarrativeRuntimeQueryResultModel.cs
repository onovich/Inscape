namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryResultModel {

        public bool Found { get; set; }

        public NarrativeRuntimeQuerySourceKindModel SourceKind { get; set; }

        public NarrativeRuntimeQueryValueModel Value { get; set; }

        public bool IsReadOnly { get; set; }

        public bool IsDeterministic { get; set; }

        public NarrativeRuntimeQueryResultModel() {
            Value = new NarrativeRuntimeQueryValueModel();
            IsReadOnly = true;
            IsDeterministic = true;
        }

    }

}
