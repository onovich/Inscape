namespace Inscape.Cli {

    internal static class CliCommandProvider {

        static readonly CliCommandModel[] CommandModels = new[] {
            new CliCommandModel("check", "Single-file", false,
                                     "Validate one .inscape file and print diagnostics.",
                                     "inscape check <file.inscape>",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- check samples\\court-loop.inscape"),
            new CliCommandModel("diagnose", "Single-file", false,
                                     "Compile one .inscape file and write graph IR plus diagnostics as JSON.",
                                     "inscape diagnose <file.inscape> [-o diagnostics.json]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose samples\\court-loop.inscape -o artifacts\\court-loop.diagnostics.json"),
            new CliCommandModel("compile", "Single-file", false,
                                     "Compile one .inscape file and write graph IR as JSON.",
                                     "inscape compile <file.inscape> [-o output.json]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- compile samples\\court-loop.inscape -o artifacts\\court-loop.json"),
            new CliCommandModel("preview", "Single-file", false,
                                     "Render one .inscape file to a static HTML debug preview.",
                                     "inscape preview <file.inscape> [-o preview.html]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- preview samples\\court-loop.inscape -o artifacts\\court-loop.html"),
            new CliCommandModel("extract-l10n", "Single-file", false,
                                     "Extract localizable text from one .inscape file to CSV.",
                                     "inscape extract-l10n <file.inscape> [-o strings.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n samples\\court-loop.inscape -o artifacts\\court-loop.l10n.csv"),
            new CliCommandModel("update-l10n", "Single-file", false,
                                     "Update a one-file localization CSV from a previous CSV by exact anchor match.",
                                     "inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n samples\\court-loop.inscape --from artifacts\\old-l10n.csv -o artifacts\\court-loop.l10n.csv"),
            new CliCommandModel("export-host-schema-template", "Host schema", false,
                                     "Write a first host schema template for pure queries and host events.",
                                     "inscape export-host-schema-template [-o inscape.host.schema.json]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-host-schema-template -o config\\inscape.host.schema.json",
                                     "The template is a versioned design scaffold. It does not change current DSL parsing or UnitySample export behavior."),
            new CliCommandModel("check-project", "Project", true,
                                     "Validate all .inscape files under a project root.",
                                     "inscape check-project <root> [--entry node.name]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- check-project samples"),
            new CliCommandModel("diagnose-project", "Project", true,
                                     "Compile a project and write project IR plus diagnostics as JSON.",
                                     "inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose-project samples -o artifacts\\samples.diagnostics.json"),
            new CliCommandModel("compile-project", "Project", true,
                                     "Compile a project and write project IR as JSON.",
                                     "inscape compile-project <root> [--entry node.name] [-o output.json]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- compile-project samples -o artifacts\\samples-project.json"),
            new CliCommandModel("preview-project", "Project", true,
                                     "Render a project to a static HTML debug preview.",
                                     "inscape preview-project <root> [--entry node.name] [-o preview.html]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- preview-project samples --entry court.cross_exam.loop -o artifacts\\samples-project.html"),
            new CliCommandModel("extract-l10n-project", "Project", true,
                                     "Extract project localizable text to CSV.",
                                     "inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\\l10n.csv"),
            new CliCommandModel("update-l10n-project", "Project", true,
                                     "Update a project localization CSV from a previous CSV by exact anchor match.",
                                     "inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\\old-l10n.csv -o artifacts\\l10n.updated.csv"),
            new CliCommandModel("export-unity-sample-role-template", "UnitySample", true,
                                     "Scan project dialogue speakers and write a UnitySample role binding template.",
                                     "inscape export-unity-sample-role-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-role-name-csv path] [--report report.csv] [-o roles.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-role-template samples --unity-sample-existing-role-name-csv D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Localization\\L10N_RoleName.csv --report artifacts\\unity-sample-export\\unity-sample-roles.report.csv -o config\\unity-sample-roles.csv",
                                     "Output CSV: speaker,roleId. Optional report statuses: unique, ambiguous, missing, unscanned."),
            new CliCommandModel("export-unity-sample-binding-template", "UnitySample", true,
                                     "Scan Timeline hooks and write a UnitySample host binding template.",
                                     "inscape export-unity-sample-binding-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-timeline-root path] [-o bindings.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-binding-template samples --unity-sample-existing-timeline-root D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Timeline -o config\\unity-sample-bindings.csv",
                                     "Output CSV: kind,alias,unitySampleId,unityGuid,addressableKey,assetPath"),
            new CliCommandModel("export-unity-sample-project", "UnitySample", true,
                                     "Export project IR to UnitySample manifest, UnitySample L10N CSV, anchor map, and report.",
                                     "inscape export-unity-sample-project <root> [--config inscape.config.json] [--entry node.name] [--unity-sample-talking-start 100000] [--unity-sample-role-map roles.csv] [--unity-sample-binding-map bindings.csv] [--unity-sample-existing-talking-root path] -o output-dir",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- export-unity-sample-project samples --unity-sample-role-map config\\unity-sample-roles.csv --unity-sample-binding-map config\\unity-sample-bindings.csv -o artifacts\\unity-sample-export",
                                     "Output files: unity-sample-manifest.json, L10N_Talking.csv, inscape-unity-sample-l10n-map.csv, unity-sample-export-report.txt"),
            new CliCommandModel("merge-unity-sample-l10n", "UnitySample", false,
                                     "Merge generated Inscape UnitySample L10N_Talking.csv into an existing UnitySample L10N_Talking.csv without silently reusing stale translations.",
                                     "inscape merge-unity-sample-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]",
                                     "dotnet run --project src\\Inscape.Cli\\Inscape.Cli.csproj -- merge-unity-sample-l10n artifacts\\unity-sample-export\\L10N_Talking.csv --from D:\\UnityProjects\\UnitySample\\Assets\\Resources_Runtime\\Localization\\L10N_Talking.csv --report artifacts\\unity-sample-export\\L10N_Talking.merge-report.csv -o artifacts\\unity-sample-export\\L10N_Talking.merged.csv",
                                     "Preserves unrelated rows and existing translations when source text is unchanged. If source text changed, target-language cells are cleared and old values are written to the report.")
        };

        static readonly string[] CategoryOrder = new[] {
            "Single-file",
            "Host schema",
            "Project",
            "UnitySample",
        };

        public static bool IsProjectCommand(string command) {
            CliCommandModel? commandModel = Find(command);
            return commandModel != null && commandModel.IsProjectCommand;
        }

        public static void PrintUsage() {
            Console.WriteLine("Inscape CLI");
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  inscape commands");
            Console.WriteLine("  inscape help <command>");
            Console.WriteLine("  inscape export-host-schema-template [-o inscape.host.schema.json]");
            Console.WriteLine("  inscape check <file.inscape>");
            Console.WriteLine("  inscape diagnose <file.inscape> [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n <file.inscape> [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n <file.inscape> --from old.csv [-o strings.csv]");
            Console.WriteLine("  inscape check-project <root> [--entry node.name]");
            Console.WriteLine("  inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n-project <root> --from old.csv [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape export-unity-sample-binding-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-timeline-root path] [-o bindings.csv]");
            Console.WriteLine("  inscape export-unity-sample-role-template <root> [--config inscape.config.json] [--entry node.name] [--override source.inscape temp.inscape] [--unity-sample-existing-role-name-csv path] [--report report.csv] [-o roles.csv]");
            Console.WriteLine("  inscape export-unity-sample-project <root> [--config inscape.config.json] [--entry node.name] [--unity-sample-talking-start 100000] [--unity-sample-role-map roles.csv] [--unity-sample-binding-map bindings.csv] [--unity-sample-existing-talking-root path] -o output-dir");
            Console.WriteLine("  inscape merge-unity-sample-l10n <generated-L10N_Talking.csv> --from existing-L10N_Talking.csv [--report report.csv] [-o merged.csv]");
            Console.WriteLine("  inscape compile-project <root> [--entry node.name] [-o output.json]");
            Console.WriteLine("  inscape preview-project <root> [--entry node.name] [-o preview.html]");
            Console.WriteLine("  inscape compile <file.inscape> [-o output.json]");
            Console.WriteLine("  inscape preview <file.inscape> [-o preview.html]");
        }

        public static void PrintCommandList() {
            Console.WriteLine("Inscape CLI commands");
            Console.WriteLine();

            for (int categoryIndex = 0; categoryIndex < CategoryOrder.Length; categoryIndex += 1) {
                string category = CategoryOrder[categoryIndex];
                Console.WriteLine(category + ":");
                for (int commandIndex = 0; commandIndex < CommandModels.Length; commandIndex += 1) {
                    CliCommandModel commandModel = CommandModels[commandIndex];
                    if (commandModel.Category == category) {
                        Console.WriteLine("  " + commandModel.Name);
                    }
                }
                Console.WriteLine();
            }

            Console.WriteLine("Run `inscape help <command>` for details.");
        }

        public static bool PrintCommandHelp(string command) {
            CliCommandModel? commandModel = Find(command);
            if (commandModel == null) {
                Console.Error.WriteLine("Unknown command: " + command);
                Console.Error.WriteLine("Run `inscape commands` to list available commands.");
                return false;
            }

            PrintCommandHelpBlock(commandModel.Name,
                                  commandModel.Description,
                                  commandModel.Usage,
                                  commandModel.Example,
                                  commandModel.Note);
            return true;
        }

        static CliCommandModel? Find(string command) {
            for (int i = 0; i < CommandModels.Length; i += 1) {
                if (CommandModels[i].Name == command) {
                    return CommandModels[i];
                }
            }
            return null;
        }

        static void PrintCommandHelpBlock(string command, string description, string usage, string example, string? note) {
            Console.WriteLine(command);
            Console.WriteLine();
            Console.WriteLine(description);
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  " + usage);
            Console.WriteLine();
            Console.WriteLine("Example:");
            Console.WriteLine("  " + example);
            if (!string.IsNullOrWhiteSpace(note)) {
                Console.WriteLine();
                Console.WriteLine(note);
            }
        }

        sealed class CliCommandModel {

            public string Name { get; }

            public string Category { get; }

            public bool IsProjectCommand { get; }

            public string Description { get; }

            public string Usage { get; }

            public string Example { get; }

            public string? Note { get; }

            public CliCommandModel(string name,
                                   string category,
                                   bool isProjectCommand,
                                   string description,
                                   string usage,
                                   string example,
                                   string? note = null) {
                Name = name;
                Category = category;
                IsProjectCommand = isProjectCommand;
                Description = description;
                Usage = usage;
                Example = example;
                Note = note;
            }
        }
    }
}
