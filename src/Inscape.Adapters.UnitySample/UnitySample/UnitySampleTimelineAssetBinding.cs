namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleTimelineAssetBinding {

        public int TimelineId { get; set; }

        public string UnityGuid { get; set; }

        public string AssetPath { get; set; }

        public UnitySampleTimelineAssetBinding() {
            TimelineId = 0;
            UnityGuid = string.Empty;
            AssetPath = string.Empty;
        }

    }

}

