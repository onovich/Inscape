using System.Text;
using System.Text.Json;

namespace Inscape.Cli {

    static class CliConfigLoader {

        public static bool TryReadProjectConfig(string rootPath, string[] args, JsonSerializerOptions jsonOptions, out CliProjectConfig config) {
            config = new CliProjectConfig();
            string? configuredPath = CliCore.ReadOption(args, "--config");
            string configPath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(Path.GetFullPath(rootPath), "inscape.config.json")
                : Path.GetFullPath(configuredPath);
            if (!File.Exists(configPath)) {
                if (string.IsNullOrWhiteSpace(configuredPath)) {
                    return true;
                }

                Console.Error.WriteLine("Project config not found: " + configPath);
                return false;
            }

            try {
                CliProjectConfig? parsed = JsonSerializer.Deserialize<CliProjectConfig>(File.ReadAllText(configPath, Encoding.UTF8), jsonOptions);
                config = parsed ?? new CliProjectConfig();
                NormalizeProjectConfigPaths(config, configPath);
                return true;
            } catch (Exception ex) {
                Console.Error.WriteLine("Invalid project config '" + configPath + "': " + ex.Message);
                return false;
            }
        }

        static void NormalizeProjectConfigPaths(CliProjectConfig config, string configPath) {
            string configDirectory = Path.GetDirectoryName(configPath) ?? Directory.GetCurrentDirectory();
            config.HostSchema = ResolveConfigPath(configDirectory, config.HostSchema);
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