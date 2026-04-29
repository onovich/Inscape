using Inscape.Core.Model;

namespace Inscape.Core.Bird {

    public sealed class BirdHostHook {

        public string Kind { get; set; }

        public string Alias { get; set; }

        public string Phase { get; set; }

        public string NodeName { get; set; }

        public int? TargetTalkingId { get; set; }

        public int? BirdId { get; set; }

        public string UnityGuid { get; set; }

        public string AddressableKey { get; set; }

        public string AssetPath { get; set; }

        public SourceSpan Source { get; set; }

        public BirdHostHook() {
            Kind = string.Empty;
            Alias = string.Empty;
            Phase = string.Empty;
            NodeName = string.Empty;
            TargetTalkingId = null;
            BirdId = null;
            UnityGuid = string.Empty;
            AddressableKey = string.Empty;
            AssetPath = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}
