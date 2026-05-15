namespace Inscape.Tooling {

    public sealed class DslScriptSourceOverrideModel {

        public string SourcePath { get; }

        public string ContentPath { get; }

        public DslScriptSourceOverrideModel(string sourcePath, string contentPath) {
            SourcePath = sourcePath;
            ContentPath = contentPath;
        }

    }

}
