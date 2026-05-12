using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleLocalizationMapping {

        public string Anchor { get; set; }

        public string NodeName { get; set; }

        public string Kind { get; set; }

        public string Speaker { get; set; }

        public string Text { get; set; }

        public int? TalkingId { get; set; }

        public int? TalkingIndex { get; set; }

        public string UnitySampleField { get; set; }

        public SourceSpan Source { get; set; }

        public UnitySampleLocalizationMapping() {
            Anchor = string.Empty;
            NodeName = string.Empty;
            Kind = string.Empty;
            Speaker = string.Empty;
            Text = string.Empty;
            TalkingId = null;
            TalkingIndex = null;
            UnitySampleField = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}

