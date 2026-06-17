using System;
using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryProviderModel {

        public NarrativeRuntimeQueryProviderKindModel Kind { get; set; }

        public Func<NarrativeRuntimeQueryRequestModel, NarrativeRuntimeQueryResultModel?>? DelegateQuery { get; set; }

        public List<NarrativeRuntimeQueryValueEntryModel> MockValues { get; set; }

        public List<NarrativeRuntimeQueryValueEntryModel> RecordedValues { get; set; }

        public NarrativeRuntimeQueryProviderModel() {
            MockValues = new List<NarrativeRuntimeQueryValueEntryModel>();
            RecordedValues = new List<NarrativeRuntimeQueryValueEntryModel>();
        }

    }

}
