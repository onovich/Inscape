namespace Inscape.Compiler.Model {

    public sealed class DslScriptConditionLiteralModel {

        public DslScriptConditionLiteralKindModel LiteralKind { get; set; }

        public string Raw { get; set; }

        public string StringValue { get; set; }

        public double NumberValue { get; set; }

        public bool BoolValue { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptConditionLiteralModel() {
            LiteralKind = DslScriptConditionLiteralKindModel.Unknown;
            Raw = string.Empty;
            StringValue = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
