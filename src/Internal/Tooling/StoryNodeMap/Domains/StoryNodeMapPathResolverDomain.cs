namespace Inscape.Tooling {

    public static class StoryNodeMapPathResolverDomain {

        public static string Resolve(string rootPath, string? configuredConfigPath, string? configuredNodeMapPath) {
            if (!string.IsNullOrWhiteSpace(configuredNodeMapPath)) {
                return Path.GetFullPath(configuredNodeMapPath);
            }

            if (!string.IsNullOrWhiteSpace(configuredConfigPath)) {
                string configDirectory = Path.GetDirectoryName(Path.GetFullPath(configuredConfigPath)) ?? Path.GetFullPath(rootPath);
                return Path.Combine(configDirectory, "inscape.node-map.json");
            }

            return Path.Combine(Path.GetFullPath(rootPath), "inscape.node-map.json");
        }

    }

}
