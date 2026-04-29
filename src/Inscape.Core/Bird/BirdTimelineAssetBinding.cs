namespace Inscape.Core.Bird {

    public sealed class BirdTimelineAssetBinding {

        public int TimelineId { get; set; }

        public string UnityGuid { get; set; }

        public string AssetPath { get; set; }

        public BirdTimelineAssetBinding() {
            TimelineId = 0;
            UnityGuid = string.Empty;
            AssetPath = string.Empty;
        }

    }

}
