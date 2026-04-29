namespace Inscape.Core.Bird {

    public sealed class BirdHostBinding {

        public string Kind { get; set; }

        public string Alias { get; set; }

        public int? BirdId { get; set; }

        public string UnityGuid { get; set; }

        public string AddressableKey { get; set; }

        public string AssetPath { get; set; }

        public BirdHostBinding() {
            Kind = string.Empty;
            Alias = string.Empty;
            BirdId = null;
            UnityGuid = string.Empty;
            AddressableKey = string.Empty;
            AssetPath = string.Empty;
        }

    }

}
