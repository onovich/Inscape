using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleChoiceOptionEntry {

        public string Text { get; set; }

        public string Anchor { get; set; }

        public string TargetNodeName { get; set; }

        public int? NextTalkingId { get; set; }

        public SourceSpan Source { get; set; }

        public UnitySampleChoiceOptionEntry() {
            Text = string.Empty;
            Anchor = string.Empty;
            TargetNodeName = string.Empty;
            NextTalkingId = null;
            Source = SourceSpan.Empty;
        }

    }

}

