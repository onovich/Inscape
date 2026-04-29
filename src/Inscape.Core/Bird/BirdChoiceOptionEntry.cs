using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdChoiceOptionEntry {

        public string Text { get; set; }

        public string Anchor { get; set; }

        public string TargetNodeName { get; set; }

        public int? NextTalkingId { get; set; }

        public SourceSpan Source { get; set; }

        public BirdChoiceOptionEntry() {
            Text = string.Empty;
            Anchor = string.Empty;
            TargetNodeName = string.Empty;
            NextTalkingId = null;
            Source = SourceSpan.Empty;
        }

    }

}
