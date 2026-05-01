using System.Collections.Generic;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleManifest {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public string SourceFormat { get; set; }

        public string RootPath { get; set; }

        public string EntryNodeName { get; set; }

        public int TalkingIdStart { get; set; }

        public List<string> Languages { get; set; }

        public List<UnitySampleRoleBinding> Roles { get; set; }

        public List<UnitySampleHostBinding> HostBindings { get; set; }

        public List<UnitySampleHostHook> HostHooks { get; set; }

        public List<UnitySampleNodeEntry> Nodes { get; set; }

        public List<UnitySampleTalkingEntry> Talkings { get; set; }

        public List<UnitySampleLocalizationMapping> Localization { get; set; }

        public List<UnitySampleExportWarning> Warnings { get; set; }

        public UnitySampleManifest() {
            Format = "inscape.unity-sample-manifest";
            FormatVersion = 1;
            SourceFormat = "inscape.project-ir";
            RootPath = string.Empty;
            EntryNodeName = string.Empty;
            TalkingIdStart = 100000;
            Languages = new List<string>();
            Roles = new List<UnitySampleRoleBinding>();
            HostBindings = new List<UnitySampleHostBinding>();
            HostHooks = new List<UnitySampleHostHook>();
            Nodes = new List<UnitySampleNodeEntry>();
            Talkings = new List<UnitySampleTalkingEntry>();
            Localization = new List<UnitySampleLocalizationMapping>();
            Warnings = new List<UnitySampleExportWarning>();
        }

    }

}

