using System.Collections.Generic;

namespace Inscape.Core.Bird {

    public sealed class BirdManifest {

        public string Format { get; set; }

        public int FormatVersion { get; set; }

        public string SourceFormat { get; set; }

        public string RootPath { get; set; }

        public string EntryNodeName { get; set; }

        public int TalkingIdStart { get; set; }

        public List<string> Languages { get; set; }

        public List<BirdRoleBinding> Roles { get; set; }

        public List<BirdHostBinding> HostBindings { get; set; }

        public List<BirdHostHook> HostHooks { get; set; }

        public List<BirdNodeEntry> Nodes { get; set; }

        public List<BirdTalkingEntry> Talkings { get; set; }

        public List<BirdLocalizationMapping> Localization { get; set; }

        public BirdManifest() {
            Format = "inscape.bird-manifest";
            FormatVersion = 1;
            SourceFormat = "inscape.project-ir";
            RootPath = string.Empty;
            EntryNodeName = string.Empty;
            TalkingIdStart = 100000;
            Languages = new List<string>();
            Roles = new List<BirdRoleBinding>();
            HostBindings = new List<BirdHostBinding>();
            HostHooks = new List<BirdHostHook>();
            Nodes = new List<BirdNodeEntry>();
            Talkings = new List<BirdTalkingEntry>();
            Localization = new List<BirdLocalizationMapping>();
        }

    }

}
