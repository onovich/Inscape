namespace Inscape.Compiler.Model {

    public sealed class DslScriptConditionModel {

        public string Raw { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptConditionExpressionModel? Expression { get; set; }

        public DslScriptConditionModel() {
            Raw = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
