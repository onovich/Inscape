namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleExportResult {

        public UnitySampleManifest Manifest { get; set; }

        public string L10nTalkingCsv { get; set; }

        public string AnchorMapCsv { get; set; }

        public string ReportText { get; set; }

        public UnitySampleExportResult(UnitySampleManifest manifest, string l10nTalkingCsv, string anchorMapCsv, string reportText) {
            Manifest = manifest;
            L10nTalkingCsv = l10nTalkingCsv;
            AnchorMapCsv = anchorMapCsv;
            ReportText = reportText;
        }

    }

}

