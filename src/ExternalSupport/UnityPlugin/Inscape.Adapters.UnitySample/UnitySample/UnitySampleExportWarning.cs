using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleExportWarning {

        public string Code { get; set; }

        public string Message { get; set; }

        public SourceSpan Source { get; set; }

        public UnitySampleExportWarning() {
            Code = string.Empty;
            Message = string.Empty;
            Source = SourceSpan.Empty;
        }

        public UnitySampleExportWarning(string code, string message, SourceSpan source) {
            Code = code;
            Message = message;
            Source = source;
        }

    }

}

