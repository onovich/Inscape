using System.Text.Json;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Localization;
using Inscape.Compiler.Model;
using Inscape.Tooling;

namespace Inscape.Cli {

    static class CliStoryGraphCommand {

        public static int Run(string command, string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (command == "inspect-host-schema-project") {
                return RunHostSchemaInspection(rootPath, args, outputPath, jsonOptions);
            }

            if (command == "audit-query-interpolation-project") {
                return RunQueryInterpolationAudit(rootPath, args, outputPath, jsonOptions);
            }

            if (command == "update-node-map-project") {
                return RunStoryNodeMapUpdate(rootPath, args, outputPath, jsonOptions);
            }

            if (command == "audit-l10n-alignment-project") {
                return RunLocalizationAlignmentAudit(rootPath, args, outputPath, jsonOptions);
            }

            if (command == "refresh-l10n-line-map-project") {
                return RunLocalizationLineMapRefresh(rootPath, args, outputPath, jsonOptions);
            }

            if (!TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out StoryGraphCompilationResultModel result)) {
                return 1;
            }

            switch (command) {
                case "check-project":
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "diagnose-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CreateProjectCompileViewModel(result), jsonOptions));
                    return 0;

                case "compile-project":
                    CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(CreateProjectCompileViewModel(result), jsonOptions));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "preview-project":
                    PreviewStyleSheetModel previewStyle = PreviewStyleReaderDomain.Read(config.Styles.Preview, jsonOptions, out string? previewStyleError);
                    if (!string.IsNullOrWhiteSpace(previewStyleError)) {
                        Console.Error.WriteLine(previewStyleError);
                    }

                    CliCore.WriteOrPrint(outputPath,
                                         PreviewHtmlRendererDomain.Render(CreateProjectCompileViewModel(result),
                                                                       jsonOptions,
                                                                       previewStyle));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "extract-l10n-project":
                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Extract(result.Graph));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                case "update-l10n-project":
                    if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(CliCore.ReadOption(args, "--from"), out List<LocalizationEntryModel> previousEntries, out string? localizationError)) {
                        Console.Error.WriteLine(localizationError);
                        return 1;
                    }

                    CliCore.WriteOrPrint(outputPath, LocalizationCsvFlowDomain.Update(result.Graph, previousEntries));
                    CliCore.PrintDiagnostics(result.Diagnostics);
                    return result.HasErrors ? 1 : 0;

                default:
                    Console.Error.WriteLine("Unknown project command: " + command);
                    CliCommandProvider.PrintUsage();
                    return 1;
            }
        }

        static int RunHostSchemaInspection(string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return 3;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out ToolConfigModel config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return 3;
            }

            HostSchemaCapabilityCatalogModel catalog = HostSchemaCapabilityCatalogDomain.Read(rootPath, config.HostSchema, jsonOptions);
            CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(catalog, jsonOptions));
            return catalog.HostSchema.ErrorMessage == null ? 0 : 3;
        }

        static int RunQueryInterpolationAudit(string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return 3;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out ToolConfigModel config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return 3;
            }

            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(rootPath, null);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return 3;
            }

            HostSchemaQueryReadResultModel hostSchemaQueries = HostSchemaQueryReaderDomain.Read(config.HostSchema, jsonOptions);
            QueryInterpolationAuditModel audit = QueryInterpolationAuditDomain.Audit(rootPath, config, sources, hostSchemaQueries);
            string format = CliCore.ReadOption(args, "--format") ?? "text";
            if (format == "json") {
                CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(audit, jsonOptions));
                return 0;
            }

            if (format != "text") {
                Console.Error.WriteLine("Unsupported audit format: " + format);
                return 2;
            }

            CliCore.WriteOrPrint(outputPath, CreateQueryInterpolationAuditText(audit));
            return 0;
        }

        static int RunStoryNodeMapUpdate(string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            string? configuredPath = CliCore.ReadOption(args, "--config");
            string? reportPath = CliCore.ReadOption(args, "--report");
            if (!TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out StoryGraphCompilationResultModel result)) {
                return 1;
            }

            CliCore.PrintDiagnostics(result.Diagnostics);
            if (result.HasErrors) {
                return 1;
            }

            string nodeMapPath = string.IsNullOrWhiteSpace(outputPath)
                ? StoryNodeMapPathResolverDomain.Resolve(rootPath, configuredPath, config.NodeMap)
                : Path.GetFullPath(outputPath);

            if (!StoryNodeMapReaderDomain.TryRead(nodeMapPath, jsonOptions, out StoryNodeMapModel existingMap, out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return 3;
            }

            StoryNodeMapUpdateResultModel update = StoryNodeMapUpdateDomain.UpdateWithReport(existingMap,
                                                                                             result,
                                                                                             rootPath,
                                                                                             DateTimeOffset.UtcNow);
            StoryNodeMapWriterDomain.Write(nodeMapPath, update.NodeMap, jsonOptions);
            if (!string.IsNullOrWhiteSpace(reportPath)) {
                CliCore.WriteOrPrint(reportPath, JsonSerializer.Serialize(update.Report, jsonOptions));
            }
            Console.WriteLine(nodeMapPath);
            return 0;
        }

        static int RunLocalizationAlignmentAudit(string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            string? configuredPath = CliCore.ReadOption(args, "--config");
            string format = CliCore.ReadOption(args, "--format") ?? "json";
            if (!LocalizationCsvFlowDomain.TryReadPreviousEntries(CliCore.ReadOption(args, "--from"), out List<LocalizationEntryModel> previousEntries, out string? localizationError)) {
                Console.Error.WriteLine(localizationError);
                return 1;
            }

            if (!TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out StoryGraphCompilationResultModel result)) {
                return 1;
            }

            CliCore.PrintDiagnostics(result.Diagnostics);
            if (result.HasErrors) {
                return 1;
            }

            string nodeMapPath = StoryNodeMapPathResolverDomain.Resolve(rootPath, configuredPath, config.NodeMap);
            if (!StoryNodeMapReaderDomain.TryRead(nodeMapPath, jsonOptions, out StoryNodeMapModel nodeMap, out string? nodeMapError)) {
                Console.Error.WriteLine(nodeMapError);
                return 3;
            }

            if (!TryCreateLocalizationLineIdentityInput(rootPath,
                                                        configuredPath,
                                                        config,
                                                        result,
                                                        jsonOptions,
                                                        out LocalizationAlignmentLineIdentityInputModel lineIdentity,
                                                        out string? lineIdentityError)) {
                Console.Error.WriteLine(lineIdentityError);
                return 3;
            }

            LocalizationAlignmentReportModel report = LocalizationAlignmentAuditDomain.Audit(result, previousEntries, nodeMap, rootPath, lineIdentity);
            if (format == "json") {
                CliCore.WriteOrPrint(outputPath, JsonSerializer.Serialize(report, jsonOptions));
                return 0;
            }

            if (format == "text") {
                CliCore.WriteOrPrint(outputPath, CreateLocalizationAlignmentAuditText(report));
                return 0;
            }

            Console.Error.WriteLine("Unsupported audit format: " + format);
            return 2;
        }

        static int RunLocalizationLineMapRefresh(string rootPath, string[] args, string? outputPath, JsonSerializerOptions jsonOptions) {
            string? configuredPath = CliCore.ReadOption(args, "--config");
            if (!TryCompile(rootPath, args, jsonOptions, out ToolConfigModel config, out StoryGraphCompilationResultModel result)) {
                return 1;
            }

            CliCore.PrintDiagnostics(result.Diagnostics);
            if (result.HasErrors) {
                return 1;
            }

            string lineMapPath = string.IsNullOrWhiteSpace(outputPath)
                ? ResolveLocalizationLineMapPath(rootPath, configuredPath, config)
                : Path.GetFullPath(outputPath);
            if (!LocalizationLineMapReaderDomain.TryRead(lineMapPath, jsonOptions, out LocalizationLineMapModel existingMap, out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return 3;
            }

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(existingMap, result, rootPath);
            LocalizationLineMapWriterDomain.Write(lineMapPath, refresh.LineMap, jsonOptions);
            CliCore.WriteOrPrint(CliCore.ReadOption(args, "--report"), JsonSerializer.Serialize(refresh, jsonOptions));
            Console.WriteLine(lineMapPath);
            return 0;
        }

        static string ResolveLocalizationLineMapPath(string rootPath, string? configuredPath, ToolConfigModel config) {
            if (!string.IsNullOrWhiteSpace(config.Localization.LineMap)) {
                return config.Localization.LineMap;
            }
            string configPath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(rootPath, "inscape.config.json")
                : Path.GetFullPath(configuredPath);
            string directory = File.Exists(configPath)
                ? Path.GetDirectoryName(configPath) ?? rootPath
                : rootPath;
            return Path.Combine(directory, "inscape.line-map.json");
        }

        static bool TryCreateLocalizationLineIdentityInput(string rootPath,
                                                           string? configuredPath,
                                                           ToolConfigModel config,
                                                           StoryGraphCompilationResultModel result,
                                                           JsonSerializerOptions jsonOptions,
                                                           out LocalizationAlignmentLineIdentityInputModel input,
                                                           out string? errorMessage) {
            errorMessage = null;
            string lineMapPath = ResolveLocalizationLineMapPath(rootPath, configuredPath, config);
            input = new LocalizationAlignmentLineIdentityInputModel {
                Status = "missing",
                Path = lineMapPath,
                Message = "Localization line sidecar not found. Run refresh-l10n-line-map-project before relying on line identity.",
            };

            if (!File.Exists(lineMapPath)) {
                return true;
            }

            if (!LocalizationLineMapReaderDomain.TryRead(lineMapPath, jsonOptions, out LocalizationLineMapModel lineMap, out errorMessage)) {
                return false;
            }

            if (lineMap.Documents.Count == 0) {
                return true;
            }

            if (string.IsNullOrWhiteSpace(lineMap.LastSourceFingerprint)) {
                input.Status = "legacy";
                input.Message = "Localization line sidecar has no LastSourceFingerprint. Refresh it before using line identity for alignment.";
                return true;
            }

            LocalizationLineRefreshResultModel refresh = LocalizationLineMapRefreshDomain.Refresh(lineMap, result, rootPath);
            if (refresh.Status.HasDrift) {
                input.Status = "drift";
                input.HasDrift = true;
                input.Message = string.IsNullOrWhiteSpace(refresh.Status.Message)
                    ? "Localization line sidecar drift was detected. Refresh it before using line identity for alignment."
                    : refresh.Status.Message;
                return true;
            }

            input.Status = "available";
            input.Message = "Localization line identity is available for alignment scoring.";
            input.LineMap = refresh.LineMap;
            return true;
        }

        static string CreateLocalizationAlignmentAuditText(LocalizationAlignmentReportModel report) {
            System.Text.StringBuilder builder = new System.Text.StringBuilder();
            builder.AppendLine("Localization alignment audit: " + report.Workspace);
            if (!string.IsNullOrWhiteSpace(report.LineIdentity.Status)) {
                builder.Append("Line identity: ")
                       .Append(report.LineIdentity.Status);
                if (!string.IsNullOrWhiteSpace(report.LineIdentity.Path)) {
                    builder.Append(" (")
                           .Append(report.LineIdentity.Path)
                           .Append(')');
                }
                builder.AppendLine();
                if (!string.IsNullOrWhiteSpace(report.LineIdentity.Message)) {
                    builder.AppendLine("  " + report.LineIdentity.Message);
                }
            }
            builder.AppendLine();

            if (report.Items.Count == 0) {
                builder.AppendLine("No localization alignment items found.");
            } else {
                for (int i = 0; i < report.Items.Count; i += 1) {
                    LocalizationAlignmentItemModel item = report.Items[i];
                    builder.Append(item.Status)
                           .Append(' ')
                           .Append(item.NodeTitle)
                           .Append(' ')
                           .Append(item.Kind)
                           .Append(' ')
                           .Append(item.SourcePath);
                    if (item.Line > 0 && item.Column > 0) {
                        builder.Append(':')
                               .Append(item.Line)
                               .Append(':')
                               .Append(item.Column);
                    }
                    builder.AppendLine();
                    builder.Append("  review: ")
                           .Append(item.Review)
                           .AppendLine();
                    builder.Append("  text: ")
                           .Append(item.Text)
                           .AppendLine();
                    if (!string.IsNullOrWhiteSpace(item.LineId)) {
                        builder.Append("  lineIdentity: ")
                               .Append(item.LineId)
                               .AppendLine();
                    }
                    if (!string.IsNullOrWhiteSpace(item.Translation)) {
                        builder.Append("  translation: ")
                               .Append(item.Translation)
                               .AppendLine();
                    }

                    for (int candidateIndex = 0; candidateIndex < item.Candidates.Count; candidateIndex += 1) {
                        LocalizationAlignmentCandidateModel candidate = item.Candidates[candidateIndex];
                        builder.Append("  candidate ")
                               .Append(candidateIndex + 1)
                               .Append(": ")
                               .Append(candidate.Text);
                        if (!string.IsNullOrWhiteSpace(candidate.Translation)) {
                            builder.Append(" => ")
                                   .Append(candidate.Translation);
                        }
                        if (candidate.Similarity > 0) {
                            builder.Append(" [similarity ")
                                   .Append(candidate.Similarity.ToString("0.0000", System.Globalization.CultureInfo.InvariantCulture))
                                   .Append(']');
                        }
                        builder.Append(" [rankPenalty ")
                               .Append(candidate.RankPenalty)
                               .Append(']');
                        if (!string.IsNullOrWhiteSpace(candidate.Reason)) {
                            builder.Append(" {")
                                   .Append(candidate.Reason)
                                   .Append('}');
                        }
                        if (!string.IsNullOrWhiteSpace(candidate.LineId)) {
                            builder.Append(" <line ")
                                   .Append(candidate.LineId)
                                   .Append('>');
                        }
                        builder.AppendLine();
                    }

                    builder.AppendLine();
                }
            }

            builder.Append("Summary: kept ")
                   .Append(report.Summary.KeptCount)
                   .Append(", new ")
                   .Append(report.Summary.NewCount)
                   .Append(", changed ")
                   .Append(report.Summary.ChangedCount)
                   .Append(", removed ")
                   .Append(report.Summary.RemovedCount)
                   .Append(", conflict ")
                   .Append(report.Summary.ConflictCount)
                   .Append(", stale ")
                   .Append(report.Summary.StaleCount)
                   .Append('.');
            return builder.ToString();
        }

        static string CreateQueryInterpolationAuditText(QueryInterpolationAuditModel audit) {
            System.Text.StringBuilder builder = new System.Text.StringBuilder();
            builder.AppendLine("Query interpolation audit: " + audit.Workspace);
            if (!string.IsNullOrWhiteSpace(audit.HostSchema.ConfiguredPath)) {
                builder.AppendLine("Host Schema: " + audit.HostSchema.ConfiguredPath);
            }
            builder.AppendLine();

            if (audit.Diagnostics.Count == 0) {
                builder.AppendLine("No query interpolation issues found.");
            } else {
                for (int i = 0; i < audit.Diagnostics.Count; i += 1) {
                    QueryInterpolationAuditDiagnosticModel diagnostic = audit.Diagnostics[i];
                    builder.Append(diagnostic.Severity)
                           .Append(' ')
                           .Append(diagnostic.Code)
                           .Append(' ')
                           .Append(diagnostic.Source.Path);
                    if (diagnostic.Source.Line > 0 && diagnostic.Source.Column > 0) {
                        builder.Append(':')
                               .Append(diagnostic.Source.Line)
                               .Append(':')
                               .Append(diagnostic.Source.Column);
                    }
                    if (!string.IsNullOrWhiteSpace(diagnostic.Raw)) {
                        builder.Append(' ')
                               .Append(diagnostic.Raw);
                    }

                    builder.AppendLine();
                    builder.AppendLine("  " + diagnostic.Message);
                    builder.AppendLine();
                }
            }

            builder.Append("Summary: ")
                   .Append(audit.Summary.InterpolationCount)
                   .Append(audit.Summary.InterpolationCount == 1 ? " interpolation, " : " interpolations, ")
                   .Append(audit.Summary.DiagnosticCount)
                   .Append(audit.Summary.DiagnosticCount == 1 ? " diagnostic." : " diagnostics.");
            return builder.ToString();
        }

        static bool TryCompile(string rootPath,
                               string[] args,
                               JsonSerializerOptions jsonOptions,
                               out ToolConfigModel config,
                               out StoryGraphCompilationResultModel result) {
            config = new ToolConfigModel();
            result = CreateEmptyResult();

            if (!Directory.Exists(rootPath)) {
                Console.Error.WriteLine("Project root not found: " + rootPath);
                return false;
            }

            if (!ToolConfigReaderDomain.TryReadProjectConfig(rootPath,
                                                             CliCore.ReadOption(args, "--config"),
                                                             jsonOptions,
                                                             out config,
                                                             out string? errorMessage)) {
                Console.Error.WriteLine(errorMessage);
                return false;
            }

            DslScriptSourceOverrideModel? sourceOverride = ReadSourceOverride(args);
            List<DslScriptSourceModel> sources = DslScriptSourcesLoaderDomain.Load(rootPath, sourceOverride);
            if (sources.Count == 0) {
                Console.Error.WriteLine("No .inscape files found under: " + rootPath);
                return false;
            }

            string? entryOverrideName = CliCore.ReadOption(args, "--entry");
            StoryGraphCompilerDomain compiler = new StoryGraphCompilerDomain();
            result = compiler.Compile(sources, Path.GetFullPath(rootPath), entryOverrideName ?? string.Empty);
            return true;
        }

        static StoryGraphCompilationResultModel CreateEmptyResult() {
            return new StoryGraphCompilationResultModel(string.Empty,
                                                new List<DslScriptDocumentModel>(),
                                                new DslScriptDocumentModel(),
                                                string.Empty,
                                                new List<DiagnosticModel>());
        }

        static DslScriptSourceOverrideModel? ReadSourceOverride(string[] args) {
            for (int i = 0; i < args.Length - 2; i += 1) {
                if (args[i] == "--override") {
                    return new DslScriptSourceOverrideModel(args[i + 1], args[i + 2]);
                }
            }

            return null;
        }

        static CliStoryGraphCompileViewModel CreateProjectCompileViewModel(StoryGraphCompilationResultModel result) {
            return new CliStoryGraphCompileViewModel {
                Format = "inscape.project-ir",
                FormatVersion = 1,
                RootPath = result.RootPath,
                Documents = result.Documents,
                Graph = result.Graph,
                EntryNodeName = result.EntryNodeName,
                Diagnostics = result.Diagnostics,
                HasErrors = result.HasErrors,
            };
        }

    }

}
