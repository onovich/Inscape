using System;
using System.IO;
using System.Text.Json;
using Inscape.Tooling;

namespace Inscape.LanguageServer {

    public static class LanguageServerEntry {

        public static int Main(string[] args) {
            if (args.Length > 0 && args[0] == "--stdio") {
                LanguageServerSessionController sessionController = new LanguageServerSessionController();
                sessionController.Run(Console.OpenStandardInput(), Console.OpenStandardOutput());
                return 0;
            }

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

            if (args.Length > 1 && args[0] == "--diagnose-project") {
                string rootPath = Path.GetFullPath(args[1]);
                DslScriptProjectDiagnosticProvider provider = new DslScriptProjectDiagnosticProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-project-diagnostics",
                    formatVersion = 1,
                    rootPath,
                    diagnostics = provider.GetDiagnostics(rootPath,
                                                          ReadSourceOverride(args),
                                                          ReadOption(args, "--entry") ?? string.Empty)
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 2 && args[0] == "--definition-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptDefinitionProvider provider = new DslScriptDefinitionProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-definition",
                    formatVersion = 1,
                    definition = provider.GetNodeDefinition(source, sourcePath, args[2])
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 2 && args[0] == "--definition-project") {
                string rootPath = Path.GetFullPath(args[1]);
                DslScriptProjectNavigationProvider provider = new DslScriptProjectNavigationProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-project-definition",
                    formatVersion = 1,
                    rootPath,
                    definition = provider.GetNodeDefinition(rootPath, args[2], ReadSourceOverride(args))
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 2 && args[0] == "--references-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptReferenceProvider provider = new DslScriptReferenceProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-references",
                    formatVersion = 1,
                    references = provider.GetNodeReferences(source, sourcePath, args[2])
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 2 && args[0] == "--references-project") {
                string rootPath = Path.GetFullPath(args[1]);
                DslScriptProjectNavigationProvider provider = new DslScriptProjectNavigationProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-project-references",
                    formatVersion = 1,
                    rootPath,
                    references = provider.GetNodeReferences(rootPath, args[2], ReadSourceOverride(args))
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 1 && args[0] == "--completion-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptCompletionProvider provider = new DslScriptCompletionProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-completions",
                    formatVersion = 1,
                    completions = provider.GetNodeCompletions(source, sourcePath)
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 1 && args[0] == "--completion-project") {
                string rootPath = Path.GetFullPath(args[1]);
                DslScriptCompletionProvider provider = new DslScriptCompletionProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-project-completions",
                    formatVersion = 1,
                    rootPath,
                    completions = provider.GetProjectNodeCompletions(rootPath, ReadSourceOverride(args))
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 1 && args[0] == "--document-symbols-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptDocumentSymbolProvider provider = new DslScriptDocumentSymbolProvider();
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-document-symbols",
                    formatVersion = 1,
                    symbols = provider.GetDocumentSymbols(source, sourcePath)
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 3 && args[0] == "--hover-file") {
                string sourcePath = Path.GetFullPath(args[1]);
                string source = File.ReadAllText(sourcePath);
                DslScriptHoverProvider provider = new DslScriptHoverProvider();
                LanguageServerHoverModel? hover = args[2] == "jump"
                    ? provider.GetJumpHover(source, sourcePath, args[3])
                    : provider.GetNodeHover(source, sourcePath, args[3]);
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-hover",
                    formatVersion = 1,
                    hover
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 3 && args[0] == "--hover-project") {
                string rootPath = Path.GetFullPath(args[1]);
                DslScriptHoverProvider provider = new DslScriptHoverProvider();
                LanguageServerHoverModel? hover = args[2] == "jump"
                    ? provider.GetProjectJumpHover(rootPath, args[3], ReadSourceOverride(args))
                    : provider.GetProjectNodeHover(rootPath, args[3], ReadSourceOverride(args));
                Console.WriteLine(JsonSerializer.Serialize(new {
                    format = "inscape.language-server-project-hover",
                    formatVersion = 1,
                    rootPath,
                    hover
                }, new JsonSerializerOptions {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                }));
                return 0;
            }

            if (args.Length > 1 && args[0] == "--host-schema-capabilities-project") {
                string rootPath = Path.GetFullPath(args[1]);
                HostSchemaCapabilityProvider provider = new HostSchemaCapabilityProvider();
                Console.WriteLine(JsonSerializer.Serialize(provider.GetCapabilities(rootPath,
                                                                                     ReadOption(args, "--config"),
                                                                                     CreateJsonOptions()),
                                                           CreateJsonOptions()));
                return 0;
            }

            Console.WriteLine("Inscape.LanguageServer baseline. Use --stdio, --capabilities, --diagnose-file <path>, --diagnose-project <root> [--entry title] [--override source.inscape temp.inscape], --definition-file <path> <title>, --definition-project <root> <title> [--override source.inscape temp.inscape], --references-file <path> <title>, --references-project <root> <title> [--override source.inscape temp.inscape], --completion-file <path>, --completion-project <root> [--override source.inscape temp.inscape], --document-symbols-file <path>, --hover-file <path> <node|jump> <title>, --hover-project <root> <node|jump> <title> [--override source.inscape temp.inscape], or --host-schema-capabilities-project <root> [--config path].");
            return 0;
        }

        static string? ReadOption(string[] args, string optionName) {
            for (int i = 0; i < args.Length - 1; i += 1) {
                if (args[i] == optionName) {
                    return args[i + 1];
                }
            }

            return null;
        }

        static DslScriptSourceOverrideModel? ReadSourceOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new DslScriptSourceOverrideModel(args[i + 1], args[i + 2]);
                }
            }

            return null;
        }

        static LanguageServerCapabilityModel CreateCapabilities() {
            LanguageServerCapabilityModel model = new LanguageServerCapabilityModel();
            model.Capabilities.Add("diagnostics");
            model.Capabilities.Add("definition");
            model.Capabilities.Add("references");
            model.Capabilities.Add("completion");
            model.Capabilities.Add("hover");
            model.Capabilities.Add("documentSymbol");
            model.Capabilities.Add("hostSchemaCapabilities");
            model.Capabilities.Add("sourceReveal");
            return model;
        }

        static JsonSerializerOptions CreateJsonOptions() {
            return new JsonSerializerOptions {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

    }

}
