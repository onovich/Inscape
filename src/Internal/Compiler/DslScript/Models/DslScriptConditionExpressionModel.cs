namespace Inscape.Compiler.Model {

    public sealed class DslScriptConditionExpressionModel {

        public DslScriptConditionExpressionKindModel Kind { get; set; }

        public string Raw { get; set; }

        public string Operator { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptConditionLiteralModel? Literal { get; set; }

        public DslScriptConditionQueryModel? Query { get; set; }

        public DslScriptConditionExpressionModel? Left { get; set; }

        public DslScriptConditionExpressionModel? Right { get; set; }

        public DslScriptConditionExpressionModel? Operand { get; set; }

        public DslScriptConditionExpressionModel() {
            Raw = string.Empty;
            Operator = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
