using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryValueEntryModel {

        public string Name { get; set; }

        public List<NarrativeRuntimeQueryValueModel> Arguments { get; set; }

        public NarrativeRuntimeQueryValueModel Value { get; set; }

        public NarrativeRuntimeQueryValueEntryModel() {
            Name = string.Empty;
            Arguments = new List<NarrativeRuntimeQueryValueModel>();
            Value = new NarrativeRuntimeQueryValueModel();
        }

    }

}
