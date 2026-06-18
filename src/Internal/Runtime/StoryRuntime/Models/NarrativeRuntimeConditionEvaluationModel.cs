using System.Collections.Generic;
using Inscape.Compiler.Model;

namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeConditionEvaluationModel {

        public bool Succeeded { get; set; }

        public NarrativeRuntimeQueryValueModel Value { get; set; }

        public List<NarrativeRuntimeConditionEvaluationDiagnosticModel> Diagnostics { get; set; }

        public NarrativeRuntimeConditionEvaluationModel() {
            Value = new NarrativeRuntimeQueryValueModel();
            Diagnostics = new List<NarrativeRuntimeConditionEvaluationDiagnosticModel>();
        }

    }

    public sealed class NarrativeRuntimeConditionEvaluationDiagnosticModel {

        public string Code { get; set; }

        public string Severity { get; set; }

        public string Path { get; set; }

        public string Message { get; set; }

        public SourceSpanModel Source { get; set; }

        public NarrativeRuntimeConditionEvaluationDiagnosticModel() {
            Code = string.Empty;
            Severity = string.Empty;
            Path = string.Empty;
            Message = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
