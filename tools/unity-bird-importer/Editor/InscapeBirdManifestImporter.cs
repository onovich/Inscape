#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
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

        public static void ImportManifest(string manifestPath, string outputFolder) {
            if (!File.Exists(manifestPath)) {
                throw new FileNotFoundException("Bird manifest not found.", manifestPath);
            }

            EnsureFolder(outputFolder);
            BirdManifest manifest = JsonConvert.DeserializeObject<BirdManifest>(File.ReadAllText(manifestPath));
            if (manifest == null || manifest.talkings == null) {
                throw new InvalidOperationException("Invalid Inscape Bird manifest.");
            }

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
            EditorUtility.DisplayDialog("Inscape Bird Importer", "Imported " + manifest.talkings.Length + " TalkingSO assets.", "OK");
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

        [Serializable]
        sealed class BirdManifest {
            public BirdTalkingEntry[] talkings;
            public BirdHostHook[] hostHooks;
        }

        [Serializable]
        sealed class BirdTalkingEntry {
            public int talkingId;
            public string textDisplayType;
            public int? nextTalkingId;
            public int? roleId;
            public int textAnchorIndex;
            public BirdChoiceOptionEntry[] options;
        }

        [Serializable]
        sealed class BirdChoiceOptionEntry {
            public string text;
            public int? nextTalkingId;
        }

        [Serializable]
        sealed class BirdHostHook {
            public string kind;
            public string alias;
            public int? targetTalkingId;
            public int? birdId;
            public string unityGuid;
            public string assetPath;
        }

    }

}
#endif
