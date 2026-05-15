using Inscape.Compiler.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleExportWarning {

        public string Code { get; set; }

        public string Message { get; set; }

        public SourceSpanModel Source { get; set; }

        public UnitySampleExportWarning() {
            Code = string.Empty;
            Message = string.Empty;
            Source = SourceSpanModel.Empty;
        }

        public UnitySampleExportWarning(string code, string message, SourceSpanModel source) {
            Code = code;
            Message = message;
            Source = source;
        }

    }

}

