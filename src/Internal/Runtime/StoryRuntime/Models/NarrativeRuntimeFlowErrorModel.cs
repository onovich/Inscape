using System.Collections.Generic;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeFlowErrorModel {

        public string Code { get; set; }

        public string Severity { get; set; }

        public string Path { get; set; }

        public string Message { get; set; }

        public List<NarrativeRuntimeConditionEvaluationDiagnosticModel> ConditionDiagnostics { get; set; }

        public NarrativeRuntimeFlowErrorModel() {
            Code = string.Empty;
            Severity = string.Empty;
            Path = string.Empty;
            Message = string.Empty;
            ConditionDiagnostics = new List<NarrativeRuntimeConditionEvaluationDiagnosticModel>();
        }

    }

}
