using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdNodeEntry {

        public string Name { get; set; }

        public int EntryTalkingId { get; set; }

        public string DefaultNextNodeName { get; set; }

        public int? DefaultNextTalkingId { get; set; }

        public SourceSpan Source { get; set; }

        public BirdNodeEntry() {
            Name = string.Empty;
            EntryTalkingId = 0;
            DefaultNextNodeName = string.Empty;
            DefaultNextTalkingId = null;
            Source = SourceSpan.Empty;
        }

    }

}
