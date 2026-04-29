using System.Collections.Generic;

namespace Inscape.Core.Bird {

    public sealed class BirdExportOptions {

        public int TalkingIdStart { get; set; }

        public string[] Languages { get; set; }

        public Dictionary<string, int> RoleIdsBySpeaker { get; set; }

        public HashSet<int> ReservedTalkingIds { get; set; }

        public List<BirdHostBinding> HostBindings { get; set; }

        public BirdExportOptions() {
            TalkingIdStart = 100000;
            Languages = new[] { "ZH_CN", "EN_US", "ES_ES" };
            RoleIdsBySpeaker = new Dictionary<string, int>();
            ReservedTalkingIds = new HashSet<int>();
            HostBindings = new List<BirdHostBinding>();
        }

    }

}
