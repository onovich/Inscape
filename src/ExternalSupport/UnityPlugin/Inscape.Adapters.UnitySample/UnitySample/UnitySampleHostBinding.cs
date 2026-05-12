namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleHostBinding {

        public string Kind { get; set; }

        public string Alias { get; set; }

        public int? UnitySampleId { get; set; }

        public string UnityGuid { get; set; }

        public string AddressableKey { get; set; }

        public string AssetPath { get; set; }

        public UnitySampleHostBinding() {
            Kind = string.Empty;
            Alias = string.Empty;
            UnitySampleId = null;
            UnityGuid = string.Empty;
            AddressableKey = string.Empty;
            AssetPath = string.Empty;
        }

    }

}

