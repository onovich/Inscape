namespace Inscape.Compiler.Model {

    public sealed class DslScriptChoiceOptionModel {

        public string Text { get; set; }

        public string Target { get; set; }

        public string Anchor { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptConditionModel? Condition { get; set; }

        public DslScriptChoiceOptionModel() {
            Text = string.Empty;
            Target = string.Empty;
            Anchor = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
