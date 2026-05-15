using System.Text;
using System.Text.Json;

namespace Inscape.Tooling {

    public static class ToolConfigReaderDomain {

        public static bool TryReadProjectConfig(string rootPath,
                                                string? configuredPath,
                                                JsonSerializerOptions jsonOptions,
                                                out ToolConfigModel config,
                                                out string? errorMessage) {
            config = new ToolConfigModel();
            errorMessage = null;

            string configPath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(Path.GetFullPath(rootPath), "inscape.config.json")
                : Path.GetFullPath(configuredPath);
            if (!File.Exists(configPath)) {
                if (string.IsNullOrWhiteSpace(configuredPath)) {
                    return true;
                }

                errorMessage = "Project config not found: " + configPath;
                return false;
            }

            try {
                ToolConfigModel? parsed = JsonSerializer.Deserialize<ToolConfigModel>(File.ReadAllText(configPath, Encoding.UTF8), jsonOptions);
                config = parsed ?? new ToolConfigModel();
                NormalizeProjectConfigPaths(config, configPath);
                return true;
            } catch (Exception ex) {
                errorMessage = "Invalid project config '" + configPath + "': " + ex.Message;
                return false;
            }
        }

        static void NormalizeProjectConfigPaths(ToolConfigModel config, string configPath) {
            string configDirectory = Path.GetDirectoryName(configPath) ?? Directory.GetCurrentDirectory();
            config.HostSchema = ResolveConfigPath(configDirectory, config.HostSchema);
            config.HostBridge = ResolveConfigPath(configDirectory, config.HostBridge);
            config.Styles.Editor = ResolveConfigPath(configDirectory, config.Styles.Editor);
            config.Styles.Preview = ResolveConfigPath(configDirectory, config.Styles.Preview);
            config.UnitySample.RoleMap = ResolveConfigPath(configDirectory, config.UnitySample.RoleMap);
            config.UnitySample.BindingMap = ResolveConfigPath(configDirectory, config.UnitySample.BindingMap);
            config.UnitySample.ExistingRoleNameCsv = ResolveConfigPath(configDirectory, config.UnitySample.ExistingRoleNameCsv);
            config.UnitySample.ExistingTimelineRoot = ResolveConfigPath(configDirectory, config.UnitySample.ExistingTimelineRoot);
            config.UnitySample.ExistingTalkingRoot = ResolveConfigPath(configDirectory, config.UnitySample.ExistingTalkingRoot);
        }

        static string? ResolveConfigPath(string configDirectory, string? value) {
            if (string.IsNullOrWhiteSpace(value)) {
                return null;
            }

            if (Path.IsPathRooted(value)) {
                return value;
            }

            return Path.GetFullPath(Path.Combine(configDirectory, value));
        }

    }

}
