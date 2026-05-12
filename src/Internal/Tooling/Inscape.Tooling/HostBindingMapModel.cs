namespace Inscape.Tooling {

    public sealed class HostBindingMapEntryModel {

        public string Kind { get; set; } = string.Empty;

        public string Alias { get; set; } = string.Empty;

        public int? TargetId { get; set; }

        public string UnityGuid { get; set; } = string.Empty;

        public string AddressableKey { get; set; } = string.Empty;

        public string AssetPath { get; set; } = string.Empty;

    }

}