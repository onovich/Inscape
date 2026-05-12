using System.Collections.Generic;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleExportOptions {

        public int TalkingIdStart { get; set; }

        public string[] Languages { get; set; }

        public Dictionary<string, int> RoleIdsBySpeaker { get; set; }

        public HashSet<int> ReservedTalkingIds { get; set; }

        public List<UnitySampleHostBinding> HostBindings { get; set; }

        public UnitySampleExportOptions() {
            TalkingIdStart = 100000;
            Languages = new[] { "ZH_CN", "EN_US", "ES_ES" };
            RoleIdsBySpeaker = new Dictionary<string, int>();
            ReservedTalkingIds = new HashSet<int>();
            HostBindings = new List<UnitySampleHostBinding>();
        }

    }

}

