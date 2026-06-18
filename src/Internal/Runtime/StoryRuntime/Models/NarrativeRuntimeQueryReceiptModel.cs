using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryReceiptScopeModel {

        public string Context { get; set; }

        public string NodeId { get; set; }

        public string BranchPath { get; set; }

        public int ChoiceGroupIndex { get; set; }

        public int ChoiceOptionIndex { get; set; }

        public int ConditionalJumpIndex { get; set; }

        public NarrativeRuntimeQueryReceiptScopeModel() {
            Context = string.Empty;
            NodeId = string.Empty;
            BranchPath = string.Empty;
            ChoiceGroupIndex = -1;
            ChoiceOptionIndex = -1;
            ConditionalJumpIndex = -1;
        }

    }

    public sealed class NarrativeRuntimeQueryReceiptModel {

        public string Id { get; set; }

        public string Context { get; set; }

        public string NodeId { get; set; }

        public string BranchPath { get; set; }

        public int ChoiceGroupIndex { get; set; }

        public int ChoiceOptionIndex { get; set; }

        public int ConditionalJumpIndex { get; set; }

        public int SourceLine { get; set; }

        public int SourceColumn { get; set; }

        public string Name { get; set; }

        public string Syntax { get; set; }

        public List<NarrativeRuntimeQueryValueModel> Arguments { get; set; }

        public NarrativeRuntimeQueryValueModel Result { get; set; }

        public string SourceKind { get; set; }

        public bool Deterministic { get; set; }

        public NarrativeRuntimeQueryReceiptModel() {
            Id = string.Empty;
            Context = string.Empty;
            NodeId = string.Empty;
            BranchPath = string.Empty;
            ChoiceGroupIndex = -1;
            ChoiceOptionIndex = -1;
            ConditionalJumpIndex = -1;
            Name = string.Empty;
            Syntax = string.Empty;
            Arguments = new List<NarrativeRuntimeQueryValueModel>();
            Result = new NarrativeRuntimeQueryValueModel();
            SourceKind = string.Empty;
        }

    }

}
