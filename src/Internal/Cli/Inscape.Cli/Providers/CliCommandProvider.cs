namespace Inscape.Cli {

    internal static class CliCommandProvider {

        static readonly CliCommandModel[] CommandModels = new[] {
            new CliCommandModel("check", "Single-file", false,
                                     "Validate one .inscape file and print diagnostics.",
                                     "inscape check <file.inscape>",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- check samples\\court-loop.inscape"),
            new CliCommandModel("diagnose", "Single-file", false,
                                     "Compile one .inscape file and write graph IR plus diagnostics as JSON.",
                                     "inscape diagnose <file.inscape> [-o diagnostics.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose samples\\court-loop.inscape -o artifacts\\court-loop.diagnostics.json"),
            new CliCommandModel("compile", "Single-file", false,
                                     "Compile one .inscape file and write graph IR as JSON.",
                                     "inscape compile <file.inscape> [-o output.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- compile samples\\court-loop.inscape -o artifacts\\court-loop.json"),
            new CliCommandModel("preview", "Single-file", false,
                                     "Render one .inscape file to a static HTML debug preview.",
                                     "inscape preview <file.inscape> [-o preview.html]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- preview samples\\court-loop.inscape -o artifacts\\court-loop.html"),
            new CliCommandModel("extract-l10n", "Single-file", false,
                                     "Extract localizable text from one .inscape file to CSV.",
                                     "inscape extract-l10n <file.inscape> [-o strings.csv]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n samples\\court-loop.inscape -o artifacts\\court-loop.l10n.csv"),
            new CliCommandModel("update-l10n", "Single-file", false,
                                     "Update a one-file localization CSV from a previous CSV by exact anchor match.",
                                     "inscape update-l10n <file.inscape> --from old.csv [--translation-overrides overrides.json] [-o strings.csv]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n samples\\court-loop.inscape --from artifacts\\old-l10n.csv --translation-overrides artifacts\\overrides.json -o artifacts\\court-loop.l10n.csv"),
            new CliCommandModel("export-host-schema-template", "Host schema", false,
                                     "Write a P3 host schema template for pure queries and host actions.",
                                     "inscape export-host-schema-template [-o inscape.host.schema.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- export-host-schema-template -o config\\inscape.host.schema.json",
                                     "The template is a versioned design scaffold. It does not change current DSL parsing or UnitySample export behavior."),
            new CliCommandModel("audit-query-interpolation-project", "Host schema", true,
                                     "Audit [] query interpolation names against the configured Host Schema without changing compiler diagnostics.",
                                     "inscape audit-query-interpolation-project <root> [--format json|text] [-o audit.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- audit-query-interpolation-project samples --format json",
                                     "Warnings are explicit authoring audit output. They do not change compile-project or diagnose-project behavior."),
            new CliCommandModel("inspect-host-schema-project", "Host schema", true,
                                     "Read configured Host Schema queries and legacy events as a reusable capability catalog.",
                                     "inscape inspect-host-schema-project <root> [-o capabilities.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- inspect-host-schema-project samples -o artifacts\\host-schema-capabilities.json",
                                     "This endpoint is for editor and LanguageServer integration. It does not compile .inscape files."),
            new CliCommandModel("inspect-usage-project", "Host schema", true,
                                     "Inspect .inscape scripts and write the Usage / Requirement Manifest as JSON.",
                                     "inscape inspect-usage-project <root> [--config inscape.config.json] [-o usage.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- inspect-usage-project samples -o artifacts\\usage.json",
                                     "The manifest records script requirements only. Unknown query or action names do not make this command fail."),
            new CliCommandModel("audit-host-integration-project", "Host schema", true,
                                     "Compare Usage Manifest, Host Schema, and Host Bridge mappings as JSON.",
                                     "inscape audit-host-integration-project <root> [--config inscape.config.json] [-o audit.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- audit-host-integration-project samples -o artifacts\\host-integration-audit.json",
                                     "The audit reports integration gaps. It does not compile runtime behavior or call host handlers."),
            new CliCommandModel("export-host-integration-package-project", "Host integration", true,
                                     "Export a static Host Integration Package from an Inscape project.",
                                     "inscape export-host-integration-package-project <root> [--config inscape.config.json] -o package-dir",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- export-host-integration-package-project samples -o artifacts\\host-integration-package-smoke",
                                     "Round 2 writes the package manifest and artifact index from the shared Tooling domain. Later rounds assemble graph, usage, audit, localization, source-map, and report artifacts."),
            new CliCommandModel("update-node-map-project", "Project", true,
                                      "Create or update inscape.node-map.json for the current project.",
                                      "inscape update-node-map-project <root> [--config inscape.config.json] [-o inscape.node-map.json]",
                                      "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- update-node-map-project samples",
                                      "By default the command writes to inscape.node-map.json next to inscape.config.json, or to the workspace root when no config file exists."),
            new CliCommandModel("apply-node-map-candidate-project", "Project", true,
                                      "Apply a manual review candidate stable node id to the project node map.",
                                      "inscape apply-node-map-candidate-project <root> --current-id node_NEW --current-title title --candidate-id node_OLD [--dry-run preview.json] [--result apply-result.json] [--config inscape.config.json] [-o inscape.node-map.json]",
                                      "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- apply-node-map-candidate-project samples --current-id node_NEW --current-title courtroom.intro --candidate-id node_OLD --dry-run artifacts\\node-map-preview.json --result artifacts\\node-map-apply-result.json",
                                      "This command only applies an explicit review decision. It does not re-run rename matching or infer candidates."),
            new CliCommandModel("audit-l10n-alignment-project", "Project", true,
                                      "Audit project localization alignment against a previous CSV without updating translations.",
                                      "inscape audit-l10n-alignment-project <root> --from old.csv [--format json|text] [--config inscape.config.json] [-o l10n-review.json]",
                                      "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- audit-l10n-alignment-project samples --from artifacts\\old-l10n.csv --format text",
                                      "The report marks kept, new, changed, removed, conflict and stale items. Similar text is only a review candidate, and `--format text` emits a review-friendly summary."),
            new CliCommandModel("refresh-l10n-line-map-project", "Project", true,
                                      "Refresh persistent line identity sidecar and emit changed/added/removed report for localization workflows.",
                                      "inscape refresh-l10n-line-map-project <root> [--config inscape.config.json] [--report l10n-line-refresh.json] [-o inscape.line-map.json]",
                                      "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- refresh-l10n-line-map-project samples --report artifacts\\l10n-line-refresh.json",
                                      "By default the command writes to inscape.line-map.json next to inscape.config.json, or to the workspace root when no config file exists. Config can override the path with localization.lineMap."),
            new CliCommandModel("check-project", "Project", true,
                                      "Validate all .inscape files under a project root.",
                                      "inscape check-project <root> [--entry node.name]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- check-project samples"),
            new CliCommandModel("diagnose-project", "Project", true,
                                     "Compile a project and write project IR plus diagnostics as JSON.",
                                     "inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- diagnose-project samples -o artifacts\\samples.diagnostics.json"),
            new CliCommandModel("compile-project", "Project", true,
                                     "Compile a project and write project IR as JSON.",
                                     "inscape compile-project <root> [--entry node.name] [-o output.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- compile-project samples -o artifacts\\samples-project.json"),
            new CliCommandModel("preview-project", "Project", true,
                                     "Render a project to a static HTML debug preview.",
                                     "inscape preview-project <root> [--entry node.name] [-o preview.html]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- preview-project samples --entry court.cross_exam.loop -o artifacts\\samples-project.html"),
            new CliCommandModel("runtime-project", "Project", true,
                                     "Start or step a compiled project with NarrativeRuntime and write the current runtime state as JSON.",
                                     "inscape runtime-project <root> [--entry node.name] [--state runtime-state.json|--substate runtime-substate.json] [--query-provider provider.json] [--action-dispatcher dispatcher.json] [--action-result result.json] [--continue|--advance-flow|--rewind|--rewind-flow|--choose group option|--resume-action resume.json] [--export-state|--export-substate] [--validate-state runtime-state.json|--validate-substate runtime-substate.json] [--script-version version] [--host-checkpoint-id id] [-o runtime-state.json]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- runtime-project samples --query-provider artifacts\\runtime-query-provider.json --action-dispatcher artifacts\\runtime-actions.json --export-substate --script-version script-v1 -o artifacts\\runtime-substate.json",
                                     "This command is for editor Player integration and P4 Runtime playable smoke. Runtime consumes Compiler graph output and does not parse .inscape source text."),
            new CliCommandModel("extract-l10n-project", "Project", true,
                                     "Extract project localizable text to CSV.",
                                     "inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- extract-l10n-project samples -o artifacts\\l10n.csv"),
            new CliCommandModel("update-l10n-project", "Project", true,
                                     "Update a project localization CSV from a previous CSV by exact anchor match.",
                                     "inscape update-l10n-project <root> --from old.csv [--translation-overrides overrides.json] [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]",
                                     "dotnet run --project src\\Internal\\Cli\\Inscape.Cli\\Inscape.Cli.csproj -- update-l10n-project samples --from artifacts\\old-l10n.csv --translation-overrides artifacts\\overrides.json -o artifacts\\l10n.updated.csv"),
        };

        static readonly string[] CategoryOrder = new[] {
            "Single-file",
            "Host schema",
            "Host integration",
            "Project",
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
            Console.WriteLine("  inscape audit-query-interpolation-project <root> [--format json|text] [-o audit.json]");
            Console.WriteLine("  inscape inspect-host-schema-project <root> [-o capabilities.json]");
            Console.WriteLine("  inscape inspect-usage-project <root> [--config inscape.config.json] [-o usage.json]");
            Console.WriteLine("  inscape audit-host-integration-project <root> [--config inscape.config.json] [-o audit.json]");
            Console.WriteLine("  inscape export-host-integration-package-project <root> [--config inscape.config.json] -o package-dir");
            Console.WriteLine("  inscape update-node-map-project <root> [--config inscape.config.json] [-o inscape.node-map.json]");
            Console.WriteLine("  inscape apply-node-map-candidate-project <root> --current-id node_NEW --current-title title --candidate-id node_OLD [--dry-run preview.json] [--result apply-result.json] [--config inscape.config.json] [-o inscape.node-map.json]");
            Console.WriteLine("  inscape audit-l10n-alignment-project <root> --from old.csv [--format json|text] [--config inscape.config.json] [-o l10n-review.json]");
            Console.WriteLine("  inscape check <file.inscape>");
            Console.WriteLine("  inscape diagnose <file.inscape> [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n <file.inscape> [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n <file.inscape> --from old.csv [--translation-overrides overrides.json] [-o strings.csv]");
            Console.WriteLine("  inscape check-project <root> [--entry node.name]");
            Console.WriteLine("  inscape diagnose-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o diagnostics.json]");
            Console.WriteLine("  inscape extract-l10n-project <root> [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape update-l10n-project <root> --from old.csv [--translation-overrides overrides.json] [--entry node.name] [--override source.inscape temp.inscape] [-o strings.csv]");
            Console.WriteLine("  inscape compile-project <root> [--entry node.name] [-o output.json]");
            Console.WriteLine("  inscape preview-project <root> [--entry node.name] [-o preview.html]");
            Console.WriteLine("  inscape runtime-project <root> [--entry node.name] [--state runtime-state.json|--substate runtime-substate.json] [--query-provider provider.json] [--action-dispatcher dispatcher.json] [--action-result result.json] [--continue|--advance-flow|--rewind|--rewind-flow|--choose group option|--resume-action resume.json] [--export-state|--export-substate] [--validate-state runtime-state.json|--validate-substate runtime-substate.json] [--script-version version] [--host-checkpoint-id id] [-o runtime-state.json]");
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
