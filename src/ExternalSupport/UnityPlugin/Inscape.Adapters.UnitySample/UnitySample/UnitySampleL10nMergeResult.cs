namespace Inscape.Adapters.UnitySample {

    public sealed class UnitySampleL10nMergeResult {

        public string MergedCsv { get; set; }

        public string ReportCsv { get; set; }

        public UnitySampleL10nMergeResult(string mergedCsv, string reportCsv) {
            MergedCsv = mergedCsv;
            ReportCsv = reportCsv;
        }

    }

}

