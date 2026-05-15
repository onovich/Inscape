using System;
using System.IO;
using System.Text.Json;

namespace Inscape.LanguageServer {

    public static class LanguageServerEntry {

        public static int Main(string[] args) {
            if (args.Length > 0 && args[0] == "--capabilities") {
                Console.WriteLine(JsonSerializer.Serialize(CreateCapabilities(), new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 1 && args[0] == "--diagnose-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptDiagnosticProvider provider = new DslScriptDiagnosticProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-diagnostics",
                    formatVersion = 1,
                    diagnostics = provider.GetDiagnostics(source, sourcePath)
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            Console.WriteLine("Inscape.LanguageServer baseline. Use --capabilities or --diagnose-file <path>.");
            return 0;
        }

        static LanguageServerCapabilityModel CreateCapabilities() {
            LanguageServerCapabilityModel model = new LanguageServerCapabilityModel();
            model.Capabilities.Add("diagnostics");
            model.Capabilities.Add("definition");
            model.Capabilities.Add("references");
            model.Capabilities.Add("completion");
            model.Capabilities.Add("hover");
            model.Capabilities.Add("documentSymbol");
            model.Capabilities.Add("sourceReveal");
            return model;
        }

    }

}
