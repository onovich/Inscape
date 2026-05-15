namespace Inscape.Compiler.Compilation {

    public sealed class DslScriptSourceModel {

        public string SourcePath { get; set; }

        public string Source { get; set; }

        public DslScriptSourceModel() {
            SourcePath = string.Empty;
            Source = string.Empty;
        }

        public DslScriptSourceModel(string sourcePath, string source) {
            SourcePath = sourcePath;
            Source = source;
        }

    }

}
