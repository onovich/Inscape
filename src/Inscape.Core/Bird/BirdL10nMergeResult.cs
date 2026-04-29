namespace Inscape.Core.Bird {

    public sealed class BirdL10nMergeResult {

        public string MergedCsv { get; set; }

        public string ReportCsv { get; set; }

        public BirdL10nMergeResult(string mergedCsv, string reportCsv) {
            MergedCsv = mergedCsv;
            ReportCsv = reportCsv;
        }

    }

}
