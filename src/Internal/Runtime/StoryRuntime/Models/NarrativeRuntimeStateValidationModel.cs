using System.Collections.Generic;

namespace Inscape.Runtime {

    public enum NarrativeRuntimeStateValidationStatusModel {
        Compatible,
        Migratable,
        Incompatible,
    }

    public sealed class NarrativeRuntimeStateValidationModel {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public NarrativeRuntimeStateValidationStatusModel Status { get; set; }

        public List<NarrativeRuntimeStateValidationDiagnosticModel> Diagnostics { get; set; }

        public NarrativeRuntimeStatePositionModel SuggestedPosition { get; set; }

        public NarrativeRuntimeStateValidationModel() {
            Format = "inscape.runtime-state-validation";
            FormatVersion = 1;
            Diagnostics = new List<NarrativeRuntimeStateValidationDiagnosticModel>();
            SuggestedPosition = new NarrativeRuntimeStatePositionModel();
        }

    }

    public sealed class NarrativeRuntimeStateValidationDiagnosticModel {

        public string Code { get; set; }

        public string Severity { get; set; }

        public string Path { get; set; }

        public string Message { get; set; }

        public NarrativeRuntimeStateValidationDiagnosticModel() {
            Code = string.Empty;
            Severity = string.Empty;
            Path = string.Empty;
            Message = string.Empty;
        }

    }

}
