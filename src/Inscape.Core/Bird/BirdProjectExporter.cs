using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using Inscape.Core.Compilation;
using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdProjectExporter {

        public BirdExportResult Export(ProjectCompilationResult project) {
            return Export(project, new BirdExportOptions());
        }

        public BirdExportResult Export(ProjectCompilationResult project, BirdExportOptions options) {
            BirdManifest manifest = CreateManifest(project, options);
            string l10nTalkingCsv = WriteL10nTalkingCsv(manifest, options);
            string anchorMapCsv = WriteAnchorMapCsv(manifest.Localization);
            string reportText = WriteExportReport(manifest);
            return new BirdExportResult(manifest, l10nTalkingCsv, anchorMapCsv, reportText);
        }

        static BirdManifest CreateManifest(ProjectCompilationResult project, BirdExportOptions options) {
            BirdManifest manifest = new BirdManifest();
            manifest.RootPath = project.RootPath;
            manifest.EntryNodeName = project.EntryNodeName;
            manifest.TalkingIdStart = options.TalkingIdStart;
            manifest.Languages.AddRange(options.Languages);
            manifest.HostBindings.AddRange(options.HostBindings);
            ValidateHostBindings(manifest);

            Dictionary<string, BirdNodeEntry> nodesByName = new Dictionary<string, BirdNodeEntry>(StringComparer.Ordinal);
            Dictionary<string, int> entryTalkingIdsByNodeName = new Dictionary<string, int>(StringComparer.Ordinal);
            HashSet<string> speakers = new HashSet<string>(StringComparer.Ordinal);

            int nextTalkingId = options.TalkingIdStart;
            for (int nodeIndex = 0; nodeIndex < project.Graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = project.Graph.Nodes[nodeIndex];
                BirdNodeEntry nodeEntry = new BirdNodeEntry {
                    Name = node.Name,
                    DefaultNextNodeName = node.DefaultNext,
                    Source = node.Source,
                };
                manifest.Nodes.Add(nodeEntry);
                nodesByName[node.Name] = nodeEntry;

                List<Segment> segments = CollectSegments(node);
                for (int segmentIndex = 0; segmentIndex < segments.Count; segmentIndex += 1) {
                    Segment segment = segments[segmentIndex];
                    int talkingId = TakeNextTalkingId(options, ref nextTalkingId);
                    BirdTalkingEntry talking = new BirdTalkingEntry {
                        TalkingId = talkingId,
                        NodeName = node.Name,
                        NodeOrder = segmentIndex,
                        Kind = segment.Kind,
                        Anchor = segment.Anchor,
                        Speaker = segment.Speaker,
                        RoleId = ResolveRoleId(options, segment.Speaker),
                        TextAnchorIndex = 0,
                        TextDisplayType = "Instant",
                        TalkingIndex = 0,
                        Source = segment.Source,
                    };

                    if (!string.IsNullOrWhiteSpace(segment.Speaker)) {
                        speakers.Add(segment.Speaker);
                    }

                    manifest.Talkings.Add(talking);
                    AddTalkingLocalization(manifest, node.Name, segment, talking.TalkingId);

                    if (segmentIndex == 0) {
                        nodeEntry.EntryTalkingId = talking.TalkingId;
                        entryTalkingIdsByNodeName[node.Name] = talking.TalkingId;
                    }

                }

                if (segments.Count == 0 && HasChoices(node)) {
                    int talkingId = TakeNextTalkingId(options, ref nextTalkingId);
                    BirdTalkingEntry talking = new BirdTalkingEntry {
                        TalkingId = talkingId,
                        NodeName = node.Name,
                        NodeOrder = 0,
                        Kind = "ChoiceHost",
                        TextAnchorIndex = 0,
                        TextDisplayType = "Instant",
                        TalkingIndex = 0,
                        Source = node.Source,
                    };
                    manifest.Talkings.Add(talking);
                    nodeEntry.EntryTalkingId = talking.TalkingId;
                    entryTalkingIdsByNodeName[node.Name] = talking.TalkingId;
                }
            }

            foreach (string speaker in speakers) {
                manifest.Roles.Add(new BirdRoleBinding {
                    Speaker = speaker,
                    RoleId = ResolveRoleId(options, speaker),
                });
            }
            manifest.Roles.Sort((left, right) => string.CompareOrdinal(left.Speaker, right.Speaker));

            LinkTalkings(project.Graph, entryTalkingIdsByNodeName, nodesByName, manifest);
            ExtractHostHooks(project.Graph, manifest);
            return manifest;
        }

        static void ValidateHostBindings(BirdManifest manifest) {
            HashSet<string> seenKeys = new HashSet<string>(StringComparer.Ordinal);
            for (int i = 0; i < manifest.HostBindings.Count; i += 1) {
                BirdHostBinding binding = manifest.HostBindings[i];
                string key = binding.Kind + "\n" + binding.Alias;
                if (!seenKeys.Add(key)) {
                    manifest.Warnings.Add(new BirdExportWarning("BIRD001",
                                                                "Duplicate host binding '" + binding.Kind + ":" + binding.Alias + "'. The first matching binding will be used.",
                                                                SourceSpan.Empty));
                }
            }
        }

        static List<Segment> CollectSegments(NarrativeNode node) {
            List<Segment> segments = new List<Segment>();

            for (int i = 0; i < node.Lines.Count; i += 1) {
                NarrativeLine line = node.Lines[i];
                if (line.Kind == NarrativeLineKind.Metadata || string.IsNullOrWhiteSpace(line.Text)) {
                    continue;
                }

                segments.Add(new Segment(line.Kind.ToString(), line.Anchor, line.Speaker, line.Text, line.Source));
            }

            for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                ChoiceGroup choice = node.Choices[choiceIndex];
                if (!string.IsNullOrWhiteSpace(choice.Prompt)) {
                    segments.Add(new Segment("ChoicePrompt", choice.Anchor, string.Empty, choice.Prompt, choice.Source));
                }
            }

            return segments;
        }

        static bool HasChoices(NarrativeNode node) {
            for (int i = 0; i < node.Choices.Count; i += 1) {
                if (node.Choices[i].Options.Count > 0) {
                    return true;
                }
            }
            return false;
        }

        static int? ResolveRoleId(BirdExportOptions options, string speaker) {
            if (string.IsNullOrWhiteSpace(speaker)) {
                return null;
            }

            if (options.RoleIdsBySpeaker.TryGetValue(speaker, out int roleId)) {
                return roleId;
            }
            return null;
        }

        static int TakeNextTalkingId(BirdExportOptions options, ref int nextTalkingId) {
            while (options.ReservedTalkingIds.Contains(nextTalkingId)) {
                nextTalkingId += 1;
            }

            int talkingId = nextTalkingId;
            nextTalkingId += 1;
            return talkingId;
        }

        static void LinkTalkings(InscapeDocument graph,
                                 Dictionary<string, int> entryTalkingIdsByNodeName,
                                 Dictionary<string, BirdNodeEntry> nodesByName,
                                 BirdManifest manifest) {
            Dictionary<string, List<BirdTalkingEntry>> talkingsByNodeName = new Dictionary<string, List<BirdTalkingEntry>>(StringComparer.Ordinal);
            for (int i = 0; i < manifest.Talkings.Count; i += 1) {
                BirdTalkingEntry talking = manifest.Talkings[i];
                if (!talkingsByNodeName.TryGetValue(talking.NodeName, out List<BirdTalkingEntry>? nodeTalkings)) {
                    nodeTalkings = new List<BirdTalkingEntry>();
                    talkingsByNodeName.Add(talking.NodeName, nodeTalkings);
                }
                nodeTalkings.Add(talking);
            }

            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                if (!talkingsByNodeName.TryGetValue(node.Name, out List<BirdTalkingEntry>? nodeTalkings) || nodeTalkings.Count == 0) {
                    continue;
                }

                for (int talkingIndex = 0; talkingIndex < nodeTalkings.Count - 1; talkingIndex += 1) {
                    nodeTalkings[talkingIndex].NextTalkingId = nodeTalkings[talkingIndex + 1].TalkingId;
                }

                BirdTalkingEntry terminalTalking = nodeTalkings[nodeTalkings.Count - 1];
                AttachChoices(node, entryTalkingIdsByNodeName, manifest, terminalTalking);

                if (terminalTalking.Options.Count == 0 && !string.IsNullOrWhiteSpace(node.DefaultNext)) {
                    if (entryTalkingIdsByNodeName.TryGetValue(node.DefaultNext, out int nextTalkingId)) {
                        terminalTalking.NextTalkingId = nextTalkingId;
                        if (nodesByName.TryGetValue(node.Name, out BirdNodeEntry? nodeEntry)) {
                            nodeEntry.DefaultNextTalkingId = nextTalkingId;
                        }
                    }
                }
            }
        }

        static void AttachChoices(NarrativeNode node,
                                  Dictionary<string, int> entryTalkingIdsByNodeName,
                                  BirdManifest manifest,
                                  BirdTalkingEntry terminalTalking) {
            for (int choiceIndex = 0; choiceIndex < node.Choices.Count; choiceIndex += 1) {
                ChoiceGroup choice = node.Choices[choiceIndex];
                for (int optionIndex = 0; optionIndex < choice.Options.Count; optionIndex += 1) {
                    ChoiceOption option = choice.Options[optionIndex];
                    int? nextTalkingId = null;
                    if (entryTalkingIdsByNodeName.TryGetValue(option.Target, out int targetTalkingId)) {
                        nextTalkingId = targetTalkingId;
                    }

                    terminalTalking.Options.Add(new BirdChoiceOptionEntry {
                        Text = option.Text,
                        Anchor = option.Anchor,
                        TargetNodeName = option.Target,
                        NextTalkingId = nextTalkingId,
                        Source = option.Source,
                    });

                    if (!string.IsNullOrWhiteSpace(option.Anchor)) {
                        manifest.Localization.Add(new BirdLocalizationMapping {
                            Anchor = option.Anchor,
                            NodeName = node.Name,
                            Kind = "ChoiceOption",
                            Speaker = string.Empty,
                            Text = option.Text,
                            TalkingId = terminalTalking.TalkingId,
                            TalkingIndex = null,
                            BirdField = "TalkingOptionTM.optionText",
                            Source = option.Source,
                        });
                    }
                }
            }
        }

        static void AddTalkingLocalization(BirdManifest manifest, string nodeName, Segment segment, int talkingId) {
            if (string.IsNullOrWhiteSpace(segment.Anchor)) {
                return;
            }

            manifest.Localization.Add(new BirdLocalizationMapping {
                Anchor = segment.Anchor,
                NodeName = nodeName,
                Kind = segment.Kind,
                Speaker = segment.Speaker,
                Text = segment.Text,
                TalkingId = talkingId,
                TalkingIndex = 0,
                BirdField = "L10N_Talking.ZH_CN",
                Source = segment.Source,
            });
        }

        static void ExtractHostHooks(InscapeDocument graph, BirdManifest manifest) {
            Dictionary<string, List<BirdTalkingEntry>> talkingsByNodeName = BuildTalkingsByNodeName(manifest);

            for (int nodeIndex = 0; nodeIndex < graph.Nodes.Count; nodeIndex += 1) {
                NarrativeNode node = graph.Nodes[nodeIndex];
                for (int lineIndex = 0; lineIndex < node.Lines.Count; lineIndex += 1) {
                    NarrativeLine line = node.Lines[lineIndex];
                    if (line.Kind != NarrativeLineKind.Metadata) {
                        continue;
                    }

                    if (!TryParseTimelineHook(line.Text, out string alias)) {
                        continue;
                    }

                    BirdHostBinding? binding = ResolveHostBinding(manifest.HostBindings, "timeline", alias);
                    BirdTalkingEntry? targetTalking = FindHookTargetTalking(node.Name, line.Source.Line, talkingsByNodeName);
                    if (binding == null) {
                        manifest.Warnings.Add(new BirdExportWarning("BIRD002",
                                                                    "Timeline hook '" + alias + "' has no matching host binding. Add a 'timeline," + alias + ",...' row to --bird-binding-map.",
                                                                    line.Source));
                    }
                    if (targetTalking == null) {
                        manifest.Warnings.Add(new BirdExportWarning("BIRD003",
                                                                    "Timeline hook '" + alias + "' could not be attached to a generated talking entry.",
                                                                    line.Source));
                    }

                    manifest.HostHooks.Add(new BirdHostHook {
                        Kind = "timeline",
                        Alias = alias,
                        Phase = "talking.exit",
                        NodeName = node.Name,
                        TargetTalkingId = targetTalking == null ? (int?)null : targetTalking.TalkingId,
                        BirdId = binding == null ? null : binding.BirdId,
                        UnityGuid = binding == null ? string.Empty : binding.UnityGuid,
                        AddressableKey = binding == null ? string.Empty : binding.AddressableKey,
                        AssetPath = binding == null ? string.Empty : binding.AssetPath,
                        Source = line.Source,
                    });
                }
            }
        }

        static Dictionary<string, List<BirdTalkingEntry>> BuildTalkingsByNodeName(BirdManifest manifest) {
            Dictionary<string, List<BirdTalkingEntry>> talkingsByNodeName = new Dictionary<string, List<BirdTalkingEntry>>(StringComparer.Ordinal);
            for (int i = 0; i < manifest.Talkings.Count; i += 1) {
                BirdTalkingEntry talking = manifest.Talkings[i];
                if (!talkingsByNodeName.TryGetValue(talking.NodeName, out List<BirdTalkingEntry>? nodeTalkings)) {
                    nodeTalkings = new List<BirdTalkingEntry>();
                    talkingsByNodeName.Add(talking.NodeName, nodeTalkings);
                }
                nodeTalkings.Add(talking);
            }
            return talkingsByNodeName;
        }

        static BirdTalkingEntry? FindHookTargetTalking(string nodeName,
                                                       int hookLine,
                                                       Dictionary<string, List<BirdTalkingEntry>> talkingsByNodeName) {
            if (!talkingsByNodeName.TryGetValue(nodeName, out List<BirdTalkingEntry>? nodeTalkings) || nodeTalkings.Count == 0) {
                return null;
            }

            BirdTalkingEntry? previousTalking = null;
            for (int i = 0; i < nodeTalkings.Count; i += 1) {
                BirdTalkingEntry talking = nodeTalkings[i];
                if (talking.Source.Line < hookLine) {
                    previousTalking = talking;
                    continue;
                }

                break;
            }

            return previousTalking ?? nodeTalkings[0];
        }

        static BirdHostBinding? ResolveHostBinding(IReadOnlyList<BirdHostBinding> bindings, string kind, string alias) {
            for (int i = 0; i < bindings.Count; i += 1) {
                BirdHostBinding binding = bindings[i];
                if (binding.Kind == kind && binding.Alias == alias) {
                    return binding;
                }
            }
            return null;
        }

        static bool TryParseTimelineHook(string metadataText, out string alias) {
            alias = string.Empty;
            string trimmed = metadataText.Trim();

            if (trimmed.StartsWith("@timeline", StringComparison.Ordinal)) {
                alias = trimmed.Substring("@timeline".Length).Trim();
                if (alias.StartsWith(":", StringComparison.Ordinal)) {
                    alias = alias.Substring(1).Trim();
                }
                return alias.Length > 0;
            }

            if (!trimmed.StartsWith("[", StringComparison.Ordinal) || !trimmed.EndsWith("]", StringComparison.Ordinal)) {
                return false;
            }

            string body = trimmed.Substring(1, trimmed.Length - 2);
            int separator = body.IndexOf(':');
            if (separator < 0) {
                return false;
            }

            string key = body.Substring(0, separator).Trim();
            if (key != "timeline") {
                return false;
            }

            alias = body.Substring(separator + 1).Trim();
            return alias.Length > 0;
        }

        static string WriteExportReport(BirdManifest manifest) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("Inscape Bird Export Report");
            builder.AppendLine("format: " + manifest.Format);
            builder.AppendLine("entryNodeName: " + manifest.EntryNodeName);
            builder.AppendLine("nodes: " + manifest.Nodes.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine("talkings: " + manifest.Talkings.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine("hostBindings: " + manifest.HostBindings.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine("hostHooks: " + manifest.HostHooks.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine("localizationRows: " + manifest.Localization.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine("warnings: " + manifest.Warnings.Count.ToString(CultureInfo.InvariantCulture));
            builder.AppendLine();
            builder.AppendLine("Warnings:");

            if (manifest.Warnings.Count == 0) {
                builder.AppendLine("  none");
                return builder.ToString();
            }

            for (int i = 0; i < manifest.Warnings.Count; i += 1) {
                BirdExportWarning warning = manifest.Warnings[i];
                builder.Append("  ");
                builder.Append(warning.Code);
                builder.Append(": ");
                builder.Append(warning.Message);
                if (!string.IsNullOrWhiteSpace(warning.Source.SourcePath)) {
                    builder.Append(" (");
                    builder.Append(warning.Source.SourcePath);
                    builder.Append(":");
                    builder.Append(warning.Source.Line.ToString(CultureInfo.InvariantCulture));
                    builder.Append(":");
                    builder.Append(warning.Source.Column.ToString(CultureInfo.InvariantCulture));
                    builder.Append(")");
                }
                builder.AppendLine();
            }

            return builder.ToString();
        }

        static string WriteL10nTalkingCsv(BirdManifest manifest, BirdExportOptions options) {
            StringBuilder builder = new StringBuilder();
            builder.Append("ID");
            for (int i = 0; i < options.Languages.Length; i += 1) {
                builder.Append(',');
                builder.Append(options.Languages[i]);
            }
            builder.AppendLine();

            for (int i = 0; i < manifest.Localization.Count; i += 1) {
                BirdLocalizationMapping mapping = manifest.Localization[i];
                if (mapping.BirdField != "L10N_Talking.ZH_CN" || mapping.TalkingId == null) {
                    continue;
                }

                builder.Append(mapping.TalkingId.Value.ToString(CultureInfo.InvariantCulture));
                for (int langIndex = 0; langIndex < options.Languages.Length; langIndex += 1) {
                    builder.Append(',');
                    if (langIndex == 0) {
                        builder.Append(EscapeBirdCsvText(mapping.Text));
                    }
                }
                builder.AppendLine();
            }

            return builder.ToString();
        }

        static string WriteAnchorMapCsv(IReadOnlyList<BirdLocalizationMapping> mappings) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("anchor,node,kind,speaker,text,talkingId,talkingIndex,birdField,sourcePath,line,column");
            for (int i = 0; i < mappings.Count; i += 1) {
                BirdLocalizationMapping mapping = mappings[i];
                AppendCsvField(builder, mapping.Anchor);
                builder.Append(',');
                AppendCsvField(builder, mapping.NodeName);
                builder.Append(',');
                AppendCsvField(builder, mapping.Kind);
                builder.Append(',');
                AppendCsvField(builder, mapping.Speaker);
                builder.Append(',');
                AppendCsvField(builder, mapping.Text);
                builder.Append(',');
                AppendCsvField(builder, mapping.TalkingId == null ? string.Empty : mapping.TalkingId.Value.ToString(CultureInfo.InvariantCulture));
                builder.Append(',');
                AppendCsvField(builder, mapping.TalkingIndex == null ? string.Empty : mapping.TalkingIndex.Value.ToString(CultureInfo.InvariantCulture));
                builder.Append(',');
                AppendCsvField(builder, mapping.BirdField);
                builder.Append(',');
                AppendCsvField(builder, mapping.Source.SourcePath);
                builder.Append(',');
                AppendCsvField(builder, mapping.Source.Line.ToString(CultureInfo.InvariantCulture));
                builder.Append(',');
                AppendCsvField(builder, mapping.Source.Column.ToString(CultureInfo.InvariantCulture));
                builder.AppendLine();
            }
            return builder.ToString();
        }

        static string EscapeBirdCsvText(string text) {
            return text.Replace(",", "`")
                       .Replace("\"", "%")
                       .Replace("\r\n", "/br")
                       .Replace("\n", "/br")
                       .Replace("\r", "/br");
        }

        static void AppendCsvField(StringBuilder builder, string value) {
            bool needsQuotes = value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0;
            if (!needsQuotes) {
                builder.Append(value);
                return;
            }

            builder.Append('"');
            for (int i = 0; i < value.Length; i += 1) {
                char c = value[i];
                if (c == '"') {
                    builder.Append("\"\"");
                } else {
                    builder.Append(c);
                }
            }
            builder.Append('"');
        }

        sealed class Segment {

            public string Kind { get; private set; }

            public string Anchor { get; private set; }

            public string Speaker { get; private set; }

            public string Text { get; private set; }

            public SourceSpan Source { get; private set; }

            public Segment(string kind, string anchor, string speaker, string text, SourceSpan source) {
                Kind = kind;
                Anchor = anchor;
                Speaker = speaker;
                Text = text;
                Source = source;
            }

        }

    }

}
