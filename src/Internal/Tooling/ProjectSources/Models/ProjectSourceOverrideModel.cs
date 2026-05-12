namespace Inscape.Tooling {

    public sealed class ProjectSourceOverrideModel {

        public string SourcePath { get; }

        public string ContentPath { get; }

        public ProjectSourceOverrideModel(string sourcePath, string contentPath) {
            SourcePath = sourcePath;
            ContentPath = contentPath;
        }

    }

}
