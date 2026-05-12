using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleNodeEntry {

        public string Name { get; set; }

        public int EntryTalkingId { get; set; }

        public string DefaultNextNodeName { get; set; }

        public int? DefaultNextTalkingId { get; set; }

        public SourceSpan Source { get; set; }

        public UnitySampleNodeEntry() {
            Name = string.Empty;
            EntryTalkingId = 0;
            DefaultNextNodeName = string.Empty;
            DefaultNextTalkingId = null;
            Source = SourceSpan.Empty;
        }

    }

}

