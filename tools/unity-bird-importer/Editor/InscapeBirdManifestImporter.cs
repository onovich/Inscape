#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Bird;
using Bird.Templates;
using Newtonsoft.Json;
using UnityEditor;
using UnityEngine;

using BirdHorizontalAlignment = Bird.HorizontalAlignment;
using BirdVerticalAlignment = Bird.VerticalAlignment;

namespace Inscape.Unity.BirdImporter {

    public static class InscapeBirdManifestImporter {

        const string DefaultOutputFolder = "Assets/Resources_Runtime/Talking/InscapeGenerated";

        [MenuItem("Inscape/Bird/Import Manifest...")]
        public static void ImportManifestMenu() {
            string manifestPath = EditorUtility.OpenFilePanel("Import Inscape Bird Manifest", "", "json");
            if (string.IsNullOrEmpty(manifestPath)) {
                return;
            }

            string selectedFolder = EditorUtility.OpenFolderPanel("Select TalkingSO Output Folder", DefaultOutputFolder, "");
            if (string.IsNullOrEmpty(selectedFolder)) {
                return;
            }

            string outputFolder = ToAssetPath(selectedFolder);
            if (string.IsNullOrEmpty(outputFolder)) {
                EditorUtility.DisplayDialog("Inscape Bird Importer", "Output folder must be inside this Unity project's Assets directory.", "OK");
                return;
            }

            ImportManifest(manifestPath, outputFolder);
        }

        [MenuItem("Inscape/Bird/Dry Run Import Manifest...")]
        public static void DryRunImportManifestMenu() {
            string manifestPath = EditorUtility.OpenFilePanel("Dry Run Inscape Bird Manifest", "", "json");
            if (string.IsNullOrEmpty(manifestPath)) {
                return;
            }

            string selectedFolder = EditorUtility.OpenFolderPanel("Select TalkingSO Output Folder", DefaultOutputFolder, "");
            if (string.IsNullOrEmpty(selectedFolder)) {
                return;
            }

            string outputFolder = ToAssetPath(selectedFolder);
            if (string.IsNullOrEmpty(outputFolder)) {
                EditorUtility.DisplayDialog("Inscape Bird Importer", "Output folder must be inside this Unity project's Assets directory.", "OK");
                return;
            }

            string report = CreateImportReport(manifestPath, outputFolder);
            string reportPath = WriteDryRunReport(manifestPath, report);
            Debug.Log(report);
            EditorUtility.DisplayDialog("Inscape Bird Importer",
                                        "Dry run complete. See Unity Console and report file:\n" + reportPath,
                                        "OK");
        }

        public static void DryRunImportManifestFromCommandLine() {
            try {
                string manifestPath = ReadCommandLineArgument("-inscapeManifest");
                string outputFolder = ResolveOutputFolderArgument(ReadCommandLineArgument("-inscapeOutputFolder"));

                if (string.IsNullOrEmpty(manifestPath)) {
                    throw new InvalidOperationException("Missing required argument: -inscapeManifest <path>");
                }

                if (string.IsNullOrEmpty(outputFolder)) {
                    throw new InvalidOperationException("Missing or invalid required argument: -inscapeOutputFolder <Assets/... or absolute project path>");
                }

                string report = CreateImportReport(manifestPath, outputFolder);
                string reportPath = WriteDryRunReport(manifestPath, report);
                Debug.Log(report);
                Debug.Log("Inscape Bird Importer dry run report: " + reportPath);
                EditorApplication.Exit(0);
            } catch (Exception ex) {
                Debug.LogException(ex);
                EditorApplication.Exit(1);
            }
        }

        public static void ImportManifest(string manifestPath, string outputFolder) {
            int importedCount = ImportManifestCore(manifestPath, outputFolder);
            EditorUtility.DisplayDialog("Inscape Bird Importer", "Imported " + importedCount + " TalkingSO assets.", "OK");
        }

        public static void ImportManifestFromCommandLine() {
            try {
                string manifestPath = ReadCommandLineArgument("-inscapeManifest");
                string outputFolder = ResolveOutputFolderArgument(ReadCommandLineArgument("-inscapeOutputFolder"));

                if (string.IsNullOrEmpty(manifestPath)) {
                    throw new InvalidOperationException("Missing required argument: -inscapeManifest <path>");
                }

                if (string.IsNullOrEmpty(outputFolder)) {
                    throw new InvalidOperationException("Missing or invalid required argument: -inscapeOutputFolder <Assets/... or absolute project path>");
                }

                int importedCount = ImportManifestCore(manifestPath, outputFolder);
                Debug.Log("Inscape Bird Importer imported " + importedCount + " TalkingSO assets.");
                EditorApplication.Exit(0);
            } catch (Exception ex) {
                Debug.LogException(ex);
                EditorApplication.Exit(1);
            }
        }

        static int ImportManifestCore(string manifestPath, string outputFolder) {
            EnsureFolder(outputFolder);
            BirdManifest manifest = LoadManifest(manifestPath);
            Dictionary<int, TalkingSO> talkingsById = LoadTalkingAssetsById();
            Dictionary<int, TimelineSO> timelinesById = LoadTimelineAssetsById();

            for (int i = 0; i < manifest.talkings.Length; i += 1) {
                BirdTalkingEntry entry = manifest.talkings[i];
                if (!talkingsById.TryGetValue(entry.talkingId, out TalkingSO talkingSO) || talkingSO == null) {
                    talkingSO = CreateTalkingAsset(outputFolder, entry.talkingId);
                    talkingsById[entry.talkingId] = talkingSO;
                }
            }

            for (int i = 0; i < manifest.talkings.Length; i += 1) {
                BirdTalkingEntry entry = manifest.talkings[i];
                TalkingSO talkingSO = talkingsById[entry.talkingId];
                talkingSO.tm = BuildTalkingTM(entry, manifest, talkingsById, timelinesById);
                ApplyGuid(talkingSO);
                EditorUtility.SetDirty(talkingSO);
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            return manifest.talkings.Length;
        }

        public static string CreateImportReport(string manifestPath, string outputFolder) {
            BirdManifest manifest = LoadManifest(manifestPath);
            Dictionary<int, TalkingSO> talkingsById = LoadTalkingAssetsById();
            Dictionary<int, TimelineSO> timelinesById = LoadTimelineAssetsById();
            HashSet<int> knownTalkingIds = new HashSet<int>(talkingsById.Keys);
            for (int i = 0; i < manifest.talkings.Length; i += 1) {
                knownTalkingIds.Add(manifest.talkings[i].talkingId);
            }

            int createCount = 0;
            int updateCount = 0;
            int timelineHookCount = 0;
            int unresolvedTimelineHookCount = 0;
            int warningCount = 0;

            StringBuilder builder = new StringBuilder();
            builder.AppendLine("Inscape Bird Import Dry Run");
            builder.AppendLine("Manifest: " + manifestPath);
            builder.AppendLine("Output: " + outputFolder);
            builder.AppendLine();
            builder.AppendLine("TalkingSO plan:");

            for (int i = 0; i < manifest.talkings.Length; i += 1) {
                BirdTalkingEntry entry = manifest.talkings[i];
                bool exists = talkingsById.TryGetValue(entry.talkingId, out TalkingSO talkingSO) && talkingSO != null;
                if (exists) {
                    updateCount += 1;
                    builder.AppendLine("  UPDATE " + entry.talkingId + " -> " + AssetDatabase.GetAssetPath(talkingSO) + FormatTalkingContext(entry));
                    AppendTalkingDiff(builder, entry, talkingSO);
                } else {
                    createCount += 1;
                    builder.AppendLine("  CREATE " + entry.talkingId + " -> " + outputFolder + "/SO_Talking_Inscape_" + entry.talkingId + ".asset" + FormatTalkingContext(entry));
                    AppendCreateDetails(builder, entry);
                }

                if (entry.nextTalkingId.HasValue && !knownTalkingIds.Contains(entry.nextTalkingId.Value)) {
                    warningCount += 1;
                    builder.AppendLine("    WARNING missing nextTalkingId " + entry.nextTalkingId.Value);
                }

                if (entry.options == null) {
                    continue;
                }

                for (int optionIndex = 0; optionIndex < entry.options.Length; optionIndex += 1) {
                    BirdChoiceOptionEntry option = entry.options[optionIndex];
                    if (option.nextTalkingId.HasValue && !knownTalkingIds.Contains(option.nextTalkingId.Value)) {
                        warningCount += 1;
                        builder.AppendLine("    WARNING option '" + option.text + "' targets missing talkingId " + option.nextTalkingId.Value + FormatOptionContext(option));
                    }
                }
            }

            builder.AppendLine();
            builder.AppendLine("Timeline hook plan:");
            if (manifest.hostHooks == null || manifest.hostHooks.Length == 0) {
                builder.AppendLine("  none");
            } else {
                for (int i = 0; i < manifest.hostHooks.Length; i += 1) {
                    BirdHostHook hook = manifest.hostHooks[i];
                    if (hook.kind != "timeline") {
                        continue;
                    }

                    timelineHookCount += 1;
                    TimelineSO timelineSO = ResolveTimeline(hook, timelinesById);
                    if (timelineSO == null) {
                        unresolvedTimelineHookCount += 1;
                        warningCount += 1;
                        builder.AppendLine("  UNRESOLVED " + hook.alias + " -> talkingId " + NullableIntText(hook.targetTalkingId) + FormatHookContext(hook));
                    } else {
                        builder.AppendLine("  RESOLVE " + hook.alias + " -> " + AssetDatabase.GetAssetPath(timelineSO) + " -> talkingId " + NullableIntText(hook.targetTalkingId) + FormatHookContext(hook));
                    }
                }
            }

            builder.AppendLine();
            builder.AppendLine("Summary:");
            builder.AppendLine("  create TalkingSO: " + createCount);
            builder.AppendLine("  update TalkingSO: " + updateCount);
            builder.AppendLine("  timeline hooks: " + timelineHookCount);
            builder.AppendLine("  unresolved timeline hooks: " + unresolvedTimelineHookCount);
            builder.AppendLine("  warnings: " + warningCount);
            return builder.ToString();
        }

        static string WriteDryRunReport(string manifestPath, string report) {
            string directory = Path.GetDirectoryName(manifestPath);
            if (string.IsNullOrEmpty(directory)) {
                directory = Directory.GetCurrentDirectory();
            }

            string reportPath = Path.Combine(directory, "bird-import-dry-run-report.txt");
            File.WriteAllText(reportPath, report, Encoding.UTF8);
            return reportPath;
        }

        static BirdManifest LoadManifest(string manifestPath) {
            if (!File.Exists(manifestPath)) {
                throw new FileNotFoundException("Bird manifest not found.", manifestPath);
            }

            BirdManifest manifest = JsonConvert.DeserializeObject<BirdManifest>(File.ReadAllText(manifestPath));
            if (manifest == null || manifest.talkings == null) {
                throw new InvalidOperationException("Invalid Inscape Bird manifest.");
            }

            if (manifest.hostHooks == null) {
                manifest.hostHooks = Array.Empty<BirdHostHook>();
            }

            return manifest;
        }

        static TalkingTM BuildTalkingTM(BirdTalkingEntry entry,
                                        BirdManifest manifest,
                                        Dictionary<int, TalkingSO> talkingsById,
                                        Dictionary<int, TimelineSO> timelinesById) {
            TalkingTM tm = new TalkingTM();
            tm.talkingId = entry.talkingId;
            tm.nextTalking = ResolveTalking(entry.nextTalkingId, talkingsById);
            tm.isOption = entry.options != null && entry.options.Length > 0;
            tm.options = BuildOptions(entry.options, talkingsById);
            tm.roleId = entry.roleId ?? 0;
            tm.textAnchorIndex = entry.textAnchorIndex;
            tm.textDisplayType = ParseTextDisplayType(entry.textDisplayType);
            tm.typewritingSpeed = 0;
            tm.textVerticalAlignment = BirdVerticalAlignment.Middle;
            tm.textHorizontalAlignment = BirdHorizontalAlignment.Left;
            tm.isAutoTalking = false;
            tm.autoTalkingInterval = 0;
            tm.effects = BuildEffects(entry.talkingId, manifest, timelinesById);
            return tm;
        }

        static TalkingOptionTM[] BuildOptions(BirdChoiceOptionEntry[] options, Dictionary<int, TalkingSO> talkingsById) {
            if (options == null || options.Length == 0) {
                return Array.Empty<TalkingOptionTM>();
            }

            TalkingOptionTM[] result = new TalkingOptionTM[options.Length];
            for (int i = 0; i < options.Length; i += 1) {
                result[i] = new TalkingOptionTM {
                    optionText = options[i].text ?? string.Empty,
                    nextTalking = ResolveTalking(options[i].nextTalkingId, talkingsById),
                    conditions = Array.Empty<OptionConditionTM>(),
                };
            }
            return result;
        }

        static TalkingEffectTM[] BuildEffects(int talkingId,
                                              BirdManifest manifest,
                                              Dictionary<int, TimelineSO> timelinesById) {
            if (manifest.hostHooks == null || manifest.hostHooks.Length == 0) {
                return Array.Empty<TalkingEffectTM>();
            }

            List<TalkingEffectTM> effects = new List<TalkingEffectTM>();
            for (int i = 0; i < manifest.hostHooks.Length; i += 1) {
                BirdHostHook hook = manifest.hostHooks[i];
                if (hook.targetTalkingId != talkingId || hook.kind != "timeline") {
                    continue;
                }

                TimelineSO timelineSO = ResolveTimeline(hook, timelinesById);
                if (timelineSO == null) {
                    Debug.LogWarning("Inscape Bird Importer: timeline hook '" + hook.alias + "' could not resolve a TimelineSO.");
                    continue;
                }

                effects.Add(new TalkingEffectTM {
                    type = TalkingEffectType.PlayTimeline,
                    timelines = new[] { timelineSO },
                });
            }

            return effects.ToArray();
        }

        static TimelineSO ResolveTimeline(BirdHostHook hook, Dictionary<int, TimelineSO> timelinesById) {
            if (!string.IsNullOrEmpty(hook.unityGuid)) {
                string guidPath = AssetDatabase.GUIDToAssetPath(hook.unityGuid);
                TimelineSO byGuid = AssetDatabase.LoadAssetAtPath<TimelineSO>(guidPath);
                if (byGuid != null) {
                    return byGuid;
                }
            }

            if (!string.IsNullOrEmpty(hook.assetPath)) {
                TimelineSO byPath = AssetDatabase.LoadAssetAtPath<TimelineSO>(hook.assetPath);
                if (byPath != null) {
                    return byPath;
                }
            }

            if (hook.birdId.HasValue && timelinesById.TryGetValue(hook.birdId.Value, out TimelineSO byId)) {
                return byId;
            }

            return null;
        }

        static TalkingSO ResolveTalking(int? talkingId, Dictionary<int, TalkingSO> talkingsById) {
            if (!talkingId.HasValue) {
                return null;
            }

            talkingsById.TryGetValue(talkingId.Value, out TalkingSO talkingSO);
            return talkingSO;
        }

        static TextDisplayType ParseTextDisplayType(string value) {
            if (!string.IsNullOrEmpty(value) && Enum.TryParse(value, out TextDisplayType parsed)) {
                return parsed;
            }
            return TextDisplayType.Instant;
        }

        static TalkingSO CreateTalkingAsset(string outputFolder, int talkingId) {
            TalkingSO talkingSO = ScriptableObject.CreateInstance<TalkingSO>();
            string assetPath = AssetDatabase.GenerateUniqueAssetPath(outputFolder + "/SO_Talking_Inscape_" + talkingId + ".asset");
            AssetDatabase.CreateAsset(talkingSO, assetPath);
            return talkingSO;
        }

        static void ApplyGuid(TalkingSO talkingSO) {
            string assetPath = AssetDatabase.GetAssetPath(talkingSO);
            string fileName = Path.GetFileNameWithoutExtension(assetPath);
            talkingSO.tm.guid = AssetDatabase.AssetPathToGUID(assetPath) + "&" + fileName;
        }

        static Dictionary<int, TalkingSO> LoadTalkingAssetsById() {
            Dictionary<int, TalkingSO> result = new Dictionary<int, TalkingSO>();
            string[] guids = AssetDatabase.FindAssets("t:TalkingSO");
            for (int i = 0; i < guids.Length; i += 1) {
                TalkingSO asset = AssetDatabase.LoadAssetAtPath<TalkingSO>(AssetDatabase.GUIDToAssetPath(guids[i]));
                if (asset == null) {
                    continue;
                }
                result[asset.tm.talkingId] = asset;
            }
            return result;
        }

        static Dictionary<int, TimelineSO> LoadTimelineAssetsById() {
            Dictionary<int, TimelineSO> result = new Dictionary<int, TimelineSO>();
            string[] guids = AssetDatabase.FindAssets("t:TimelineSO");
            for (int i = 0; i < guids.Length; i += 1) {
                TimelineSO asset = AssetDatabase.LoadAssetAtPath<TimelineSO>(AssetDatabase.GUIDToAssetPath(guids[i]));
                if (asset == null) {
                    continue;
                }
                result[asset.tm.timelineId] = asset;
            }
            return result;
        }

        static void EnsureFolder(string folderPath) {
            string[] parts = folderPath.Split('/');
            string current = parts[0];
            for (int i = 1; i < parts.Length; i += 1) {
                string next = current + "/" + parts[i];
                if (!AssetDatabase.IsValidFolder(next)) {
                    AssetDatabase.CreateFolder(current, parts[i]);
                }
                current = next;
            }
        }

        static string ToAssetPath(string absolutePath) {
            string projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..")).Replace('\\', '/');
            string normalized = Path.GetFullPath(absolutePath).Replace('\\', '/');
            if (!normalized.StartsWith(projectRoot + "/", StringComparison.OrdinalIgnoreCase)) {
                return string.Empty;
            }
            return normalized.Substring(projectRoot.Length + 1);
        }

        static string ResolveOutputFolderArgument(string value) {
            if (string.IsNullOrEmpty(value)) {
                return string.Empty;
            }

            string normalized = value.Replace('\\', '/');
            if (normalized == "Assets" || normalized.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase)) {
                return normalized;
            }

            return ToAssetPath(value);
        }

        static string ReadCommandLineArgument(string name) {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length; i += 1) {
                if (args[i] == name && i + 1 < args.Length) {
                    return args[i + 1];
                }

                string prefix = name + "=";
                if (args[i].StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) {
                    return args[i].Substring(prefix.Length);
                }
            }

            return string.Empty;
        }

        static string NullableIntText(int? value) {
            return value.HasValue ? value.Value.ToString() : "(none)";
        }

        static void AppendCreateDetails(StringBuilder builder, BirdTalkingEntry entry) {
            BirdChoiceOptionEntry[] options = entry.options ?? Array.Empty<BirdChoiceOptionEntry>();
            builder.AppendLine("    roleId: " + (entry.roleId ?? 0));
            builder.AppendLine("    nextTalking: " + NullableIntText(entry.nextTalkingId));
            builder.AppendLine("    textAnchorIndex: " + entry.textAnchorIndex);
            builder.AppendLine("    textDisplayType: " + ParseTextDisplayType(entry.textDisplayType));
            builder.AppendLine("    options: " + options.Length);
            for (int i = 0; i < options.Length; i += 1) {
                builder.AppendLine("      option[" + i + "].text: " + TextValue(options[i].text));
                builder.AppendLine("      option[" + i + "].nextTalking: " + NullableIntText(options[i].nextTalkingId));
            }
        }

        static void AppendTalkingDiff(StringBuilder builder, BirdTalkingEntry entry, TalkingSO talkingSO) {
            int changes = 0;
            TalkingOptionTM[] currentOptions = talkingSO.tm.options ?? Array.Empty<TalkingOptionTM>();
            BirdChoiceOptionEntry[] expectedOptions = entry.options ?? Array.Empty<BirdChoiceOptionEntry>();
            TextDisplayType expectedTextDisplayType = ParseTextDisplayType(entry.textDisplayType);

            AppendFieldChange(builder, ref changes, "roleId", talkingSO.tm.roleId.ToString(), (entry.roleId ?? 0).ToString());
            AppendFieldChange(builder, ref changes, "nextTalking", NullableIntText(TalkingIdOf(talkingSO.tm.nextTalking)), NullableIntText(entry.nextTalkingId));
            AppendFieldChange(builder, ref changes, "textAnchorIndex", talkingSO.tm.textAnchorIndex.ToString(), entry.textAnchorIndex.ToString());
            AppendFieldChange(builder, ref changes, "textDisplayType", talkingSO.tm.textDisplayType.ToString(), expectedTextDisplayType.ToString());
            AppendFieldChange(builder, ref changes, "isOption", talkingSO.tm.isOption.ToString(), (expectedOptions.Length > 0).ToString());
            AppendFieldChange(builder, ref changes, "options.length", currentOptions.Length.ToString(), expectedOptions.Length.ToString());

            int sharedOptionCount = Math.Min(currentOptions.Length, expectedOptions.Length);
            for (int i = 0; i < sharedOptionCount; i += 1) {
                AppendFieldChange(builder,
                                  ref changes,
                                  "options[" + i + "].text",
                                  TextValue(currentOptions[i].optionText),
                                  TextValue(expectedOptions[i].text ?? string.Empty));
                AppendFieldChange(builder,
                                  ref changes,
                                  "options[" + i + "].nextTalking",
                                  NullableIntText(TalkingIdOf(currentOptions[i].nextTalking)),
                                  NullableIntText(expectedOptions[i].nextTalkingId));
            }

            if (changes == 0) {
                builder.AppendLine("    no field changes detected");
            }
        }

        static int? TalkingIdOf(TalkingSO talkingSO) {
            if (talkingSO == null) {
                return null;
            }

            return talkingSO.tm.talkingId;
        }

        static string TextValue(string value) {
            if (value == null) {
                return "(null)";
            }

            if (value.Length == 0) {
                return "\"\"";
            }

            return "\"" + value.Replace("\r", "\\r").Replace("\n", "\\n") + "\"";
        }

        static void AppendFieldChange(StringBuilder builder, ref int changes, string field, string currentValue, string expectedValue) {
            if (currentValue == expectedValue) {
                return;
            }

            builder.AppendLine("    CHANGE " + field + ": " + currentValue + " -> " + expectedValue);
            changes += 1;
        }

        static string FormatTalkingContext(BirdTalkingEntry entry) {
            StringBuilder builder = new StringBuilder();
            if (!string.IsNullOrEmpty(entry.nodeName)) {
                builder.Append(" node=");
                builder.Append(entry.nodeName);
            }
            if (!string.IsNullOrEmpty(entry.kind)) {
                builder.Append(" kind=");
                builder.Append(entry.kind);
            }
            if (!string.IsNullOrEmpty(entry.anchor)) {
                builder.Append(" anchor=");
                builder.Append(entry.anchor);
            }
            AppendSourceContext(builder, entry.source);
            return builder.ToString();
        }

        static string FormatOptionContext(BirdChoiceOptionEntry option) {
            StringBuilder builder = new StringBuilder();
            if (!string.IsNullOrEmpty(option.targetNodeName)) {
                builder.Append(" targetNode=");
                builder.Append(option.targetNodeName);
            }
            if (!string.IsNullOrEmpty(option.anchor)) {
                builder.Append(" anchor=");
                builder.Append(option.anchor);
            }
            AppendSourceContext(builder, option.source);
            return builder.ToString();
        }

        static string FormatHookContext(BirdHostHook hook) {
            StringBuilder builder = new StringBuilder();
            if (!string.IsNullOrEmpty(hook.nodeName)) {
                builder.Append(" node=");
                builder.Append(hook.nodeName);
            }
            if (!string.IsNullOrEmpty(hook.phase)) {
                builder.Append(" phase=");
                builder.Append(hook.phase);
            }
            AppendSourceContext(builder, hook.source);
            return builder.ToString();
        }

        static void AppendSourceContext(StringBuilder builder, BirdSourceSpan source) {
            if (source == null || string.IsNullOrEmpty(source.sourcePath)) {
                return;
            }

            builder.Append(" source=");
            builder.Append(source.sourcePath);
            if (source.line > 0) {
                builder.Append(":");
                builder.Append(source.line);
                if (source.column > 0) {
                    builder.Append(":");
                    builder.Append(source.column);
                }
            }
        }

        [Serializable]
        sealed class BirdManifest {
            public BirdTalkingEntry[] talkings;
            public BirdHostHook[] hostHooks;
        }

        [Serializable]
        sealed class BirdTalkingEntry {
            public int talkingId;
            public string nodeName;
            public int nodeOrder;
            public string kind;
            public string anchor;
            public string speaker;
            public string textDisplayType;
            public int? nextTalkingId;
            public int? roleId;
            public int textAnchorIndex;
            public BirdChoiceOptionEntry[] options;
            public BirdSourceSpan source;
        }

        [Serializable]
        sealed class BirdChoiceOptionEntry {
            public string text;
            public string anchor;
            public string targetNodeName;
            public int? nextTalkingId;
            public BirdSourceSpan source;
        }

        [Serializable]
        sealed class BirdHostHook {
            public string kind;
            public string alias;
            public string phase;
            public string nodeName;
            public int? targetTalkingId;
            public int? birdId;
            public string unityGuid;
            public string assetPath;
            public BirdSourceSpan source;
        }

        [Serializable]
        sealed class BirdSourceSpan {
            public string sourcePath;
            public int line;
            public int column;
        }

    }

}
#endif
