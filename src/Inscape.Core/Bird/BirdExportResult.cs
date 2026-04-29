namespace Inscape.Core.Bird {

    public sealed class BirdExportResult {

        public BirdManifest Manifest { get; set; }

        public string L10nTalkingCsv { get; set; }

        public string AnchorMapCsv { get; set; }

        public BirdExportResult(BirdManifest manifest, string l10nTalkingCsv, string anchorMapCsv) {
            Manifest = manifest;
            L10nTalkingCsv = l10nTalkingCsv;
            AnchorMapCsv = anchorMapCsv;
        }

    }

}
