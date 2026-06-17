using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryRequestModel {

        public string Name { get; set; }

        public List<NarrativeRuntimeQueryValueModel> Arguments { get; set; }

        public string Context { get; set; }

        public NarrativeRuntimeQueryRequestModel() {
            Name = string.Empty;
            Arguments = new List<NarrativeRuntimeQueryValueModel>();
            Context = string.Empty;
        }

    }

}
