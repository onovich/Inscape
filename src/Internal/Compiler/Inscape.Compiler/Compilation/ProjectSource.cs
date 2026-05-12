namespace Inscape.Core.Compilation {

    public sealed class ProjectSource {

        public string SourcePath { get; set; }

        public string Source { get; set; }

        public ProjectSource() {
            SourcePath = string.Empty;
            Source = string.Empty;
        }

        public ProjectSource(string sourcePath, string source) {
            SourcePath = sourcePath;
            Source = source;
        }

    }

}
