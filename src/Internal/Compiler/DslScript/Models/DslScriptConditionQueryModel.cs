using System.Collections.Generic;

namespace Inscape.Compiler.Model {

    public sealed class DslScriptConditionQueryModel {

        public string Name { get; set; }

        public DslScriptConditionQuerySyntaxModel Syntax { get; set; }

        public SourceSpanModel Source { get; set; }

        public List<DslScriptConditionLiteralModel> Arguments { get; set; }

        public DslScriptConditionQueryModel() {
            Name = string.Empty;
            Source = SourceSpanModel.Empty;
            Arguments = new List<DslScriptConditionLiteralModel>();
        }

    }

}
