using Inscape.Core.Model;

namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleHostHook {

        public string Kind { get; set; }

        public string Alias { get; set; }

        public string Phase { get; set; }

        public string NodeName { get; set; }

        public int? TargetTalkingId { get; set; }

        public int? UnitySampleId { get; set; }

        public string UnityGuid { get; set; }

        public string AddressableKey { get; set; }

        public string AssetPath { get; set; }

        public SourceSpan Source { get; set; }

        public UnitySampleHostHook() {
            Kind = string.Empty;
            Alias = string.Empty;
            Phase = string.Empty;
            NodeName = string.Empty;
            TargetTalkingId = null;
            UnitySampleId = null;
            UnityGuid = string.Empty;
            AddressableKey = string.Empty;
            AssetPath = string.Empty;
            Source = SourceSpan.Empty;
        }

    }

}

