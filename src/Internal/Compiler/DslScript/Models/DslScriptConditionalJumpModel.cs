namespace Inscape.Compiler.Model {

    public sealed class DslScriptConditionalJumpModel {

        public DslScriptConditionModel Condition { get; set; }

        public string Target { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptConditionalJumpModel() {
            Condition = new DslScriptConditionModel();
            Target = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
