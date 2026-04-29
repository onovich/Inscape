using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdExportWarning {

        public string Code { get; set; }

        public string Message { get; set; }

        public SourceSpan Source { get; set; }

        public BirdExportWarning() {
            Code = string.Empty;
            Message = string.Empty;
            Source = SourceSpan.Empty;
        }

        public BirdExportWarning(string code, string message, SourceSpan source) {
            Code = code;
            Message = message;
            Source = source;
        }

    }

}
