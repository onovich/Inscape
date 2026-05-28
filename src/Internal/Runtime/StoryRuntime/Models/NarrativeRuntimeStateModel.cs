using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeStateModel {

        public string CurrentNodeName { get; set; }

        public List<string> Path { get; set; }

        public int VisibleStepCount { get; set; }

        public NarrativeRuntimeStateModel() {
            CurrentNodeName = string.Empty;
            Path = new List<string>();
            VisibleStepCount = 0;
        }

    }

}
