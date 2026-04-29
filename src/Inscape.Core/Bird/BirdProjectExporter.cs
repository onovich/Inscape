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
            return new BirdExportResult(manifest, l10nTalkingCsv, anchorMapCsv);
        }

        static BirdManifest CreateManifest(ProjectCompilationResult project, BirdExportOptions options) {
            BirdManifest manifest = new BirdManifest();
            manifest.RootPath = project.RootPath;
            manifest.EntryNodeName = project.EntryNodeName;
            manifest.TalkingIdStart = options.TalkingIdStart;
            manifest.Languages.AddRange(options.Languages);

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
                    BirdTalkingEntry talking = new BirdTalkingEntry {
                        TalkingId = nextTalkingId,
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

                    nextTalkingId += 1;
                }

                if (segments.Count == 0 && HasChoices(node)) {
                    BirdTalkingEntry talking = new BirdTalkingEntry {
                        TalkingId = nextTalkingId,
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
                    nextTalkingId += 1;
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
            return manifest;
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
