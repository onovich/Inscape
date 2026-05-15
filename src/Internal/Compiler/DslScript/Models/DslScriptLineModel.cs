namespace Inscape.Compiler.Model {

    public sealed class DslScriptLineModel {

        public DslScriptLineKindModel Kind { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public string Raw { get; set; }

        public string Anchor { get; set; }

        public SourceSpanModel Source { get; set; }

        public DslScriptLineModel() {
            Speaker = string.Empty;
            Text = string.Empty;
            Raw = string.Empty;
            Anchor = string.Empty;
            Source = SourceSpanModel.Empty;
        }

    }

}
