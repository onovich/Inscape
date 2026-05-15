using System;
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

            Console.WriteLine("Inscape.LanguageServer baseline. Use --capabilities to inspect the current contract.");
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
