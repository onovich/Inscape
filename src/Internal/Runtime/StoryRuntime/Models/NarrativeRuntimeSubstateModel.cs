using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeSubstateModel {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public string RuntimeVersion { get; set; }

        public string ScriptVersion { get; set; }

        public NarrativeRuntimeStatePositionModel Position { get; set; }

        public NarrativeRuntimeStateFlowModel Flow { get; set; }

        public NarrativeRuntimeFactsModel Facts { get; set; }

        public NarrativeRuntimePendingActionModel? PendingAction { get; set; }

        public List<NarrativeRuntimeQueryReceiptModel> BranchQueryReceipts { get; set; }

        public NarrativeRuntimeStateHostModel Host { get; set; }

        public NarrativeRuntimeSubstateModel() {
            Format = "inscape.runtime-substate";
            FormatVersion = 1;
            RuntimeVersion = NarrativeRuntime.CurrentRuntimeVersion;
            ScriptVersion = string.Empty;
            Position = new NarrativeRuntimeStatePositionModel();
            Flow = new NarrativeRuntimeStateFlowModel();
            Facts = new NarrativeRuntimeFactsModel();
            BranchQueryReceipts = new List<NarrativeRuntimeQueryReceiptModel>();
            Host = new NarrativeRuntimeStateHostModel();
        }

    }

}
