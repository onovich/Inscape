using System.Collections.Generic;
using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdTalkingEntry {

        public int TalkingId { get; set; }

        public string NodeName { get; set; }

        public int NodeOrder { get; set; }

        public string Kind { get; set; }

        public string Anchor { get; set; }

        public string Speaker { get; set; }

        public int? RoleId { get; set; }

        public int TextAnchorIndex { get; set; }

        public string TextDisplayType { get; set; }

        public int TalkingIndex { get; set; }

        public int? NextTalkingId { get; set; }

        public List<BirdChoiceOptionEntry> Options { get; set; }

        public SourceSpan Source { get; set; }

        public BirdTalkingEntry() {
            TalkingId = 0;
            NodeName = string.Empty;
            NodeOrder = 0;
            Kind = string.Empty;
            Anchor = string.Empty;
            Speaker = string.Empty;
            RoleId = null;
            TextAnchorIndex = 0;
            TextDisplayType = "Instant";
            TalkingIndex = 0;
            NextTalkingId = null;
            Options = new List<BirdChoiceOptionEntry>();
            Source = SourceSpan.Empty;
        }

    }

}
