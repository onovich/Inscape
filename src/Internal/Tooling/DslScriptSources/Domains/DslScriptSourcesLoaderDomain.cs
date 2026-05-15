using System.Text;
using Inscape.Compiler.Compilation;

namespace Inscape.Tooling {

    public static class DslScriptSourcesLoaderDomain {

        public static List<DslScriptSourceModel> Load(string rootPath, DslScriptSourceOverrideModel? sourceOverride) {
            string fullRootPath = Path.GetFullPath(rootPath);
            string? overrideSourcePath = sourceOverride == null ? null : Path.GetFullPath(sourceOverride.SourcePath);
            string? overrideContentPath = sourceOverride == null ? null : Path.GetFullPath(sourceOverride.ContentPath);
            List<DslScriptSourceModel> sources = new List<DslScriptSourceModel>();
            bool overrideWasMatched = false;

            IEnumerable<string> files = Directory.EnumerateFiles(fullRootPath, "*.inscape", SearchOption.AllDirectories)
                                                .Where(path => !IsExcludedProjectPath(fullRootPath, path))
                                                .OrderBy(path => path, StringComparer.OrdinalIgnoreCase);

            foreach (string file in files) {
                string fullPath = Path.GetFullPath(file);
                if (overrideContentPath != null && IsSamePath(fullPath, overrideContentPath)) {
                    continue;
                }

                if (overrideSourcePath != null && IsSamePath(fullPath, overrideSourcePath)) {
                    sources.Add(new DslScriptSourceModel(overrideSourcePath, File.ReadAllText(sourceOverride!.ContentPath, Encoding.UTF8)));
                    overrideWasMatched = true;
                } else {
                    sources.Add(new DslScriptSourceModel(fullPath, File.ReadAllText(fullPath, Encoding.UTF8)));
                }
            }

            if (sourceOverride != null && !overrideWasMatched) {
                sources.Add(new DslScriptSourceModel(overrideSourcePath!, File.ReadAllText(sourceOverride.ContentPath, Encoding.UTF8)));
            }

            return sources;
        }

        static bool IsExcludedProjectPath(string rootPath, string filePath) {
            string relative = Path.GetRelativePath(rootPath, filePath);
            string[] parts = relative.Split(new[] { Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar });
            for (int i = 0; i < parts.Length; i += 1) {
                string part = parts[i];
                if (part == ".git" || part == "bin" || part == "obj" || part == "node_modules" || part == "artifacts") {
                    return true;
                }
            }
            return false;
        }

        static bool IsSamePath(string left, string right) {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), StringComparison.OrdinalIgnoreCase);
        }

    }

}
