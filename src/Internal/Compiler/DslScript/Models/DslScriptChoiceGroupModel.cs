using System.Collections.Generic;

namespace Inscape.Compiler.Model {

    public sealed class DslScriptChoiceGroupModel {

        public string Prompt { get; set; }

        public string Anchor { get; set; }

        public SourceSpanModel Source { get; set; }

        public List<DslScriptChoiceOptionModel> Options { get; set; }

        public DslScriptChoiceGroupModel() {
            Prompt = string.Empty;
            Anchor = string.Empty;
            Source = SourceSpanModel.Empty;
            Options = new List<DslScriptChoiceOptionModel>();
        }

    }

}
