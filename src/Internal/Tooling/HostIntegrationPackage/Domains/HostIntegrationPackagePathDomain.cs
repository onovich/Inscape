namespace Inscape.Tooling {

    public static class HostIntegrationPackagePathDomain {

        public static bool TryNormalizeArtifactPath(string path, out string normalizedPath, out string? errorMessage) {
            normalizedPath = string.Empty;
            errorMessage = null;

            if (string.IsNullOrWhiteSpace(path)) {
                errorMessage = "Host Integration Package artifact path is empty.";
                return false;
            }

            string candidate = path.Trim();
            if (Path.IsPathRooted(candidate) || candidate.StartsWith("/", StringComparison.Ordinal) || HasWindowsDrivePrefix(candidate)) {
                errorMessage = "Host Integration Package artifact path must be package-relative: " + path;
                return false;
            }

            if (candidate.Contains("://", StringComparison.Ordinal)) {
                errorMessage = "Host Integration Package artifact path must not contain a URI scheme: " + path;
                return false;
            }

            candidate = candidate.Replace('\\', '/');
            string[] segments = candidate.Split('/');
            List<string> normalizedSegments = new List<string>();
            for (int i = 0; i < segments.Length; i += 1) {
                string segment = segments[i];
                if (segment.Length == 0 || segment == ".") {
                    errorMessage = "Host Integration Package artifact path contains an empty or current-directory segment: " + path;
                    return false;
                }

                if (segment == "..") {
                    errorMessage = "Host Integration Package artifact path must not traverse outside the package: " + path;
                    return false;
                }

                normalizedSegments.Add(segment);
            }

            normalizedPath = string.Join("/", normalizedSegments);
            return true;
        }

        public static string NormalizeKnownArtifactPath(string path) {
            if (!TryNormalizeArtifactPath(path, out string normalizedPath, out string? errorMessage)) {
                throw new InvalidOperationException(errorMessage ?? "Invalid Host Integration Package artifact path.");
            }

            return normalizedPath;
        }

        static bool HasWindowsDrivePrefix(string path) {
            return path.Length >= 2
                   && path[1] == ':'
                   && ((path[0] >= 'A' && path[0] <= 'Z') || (path[0] >= 'a' && path[0] <= 'z'));
        }

    }

}
