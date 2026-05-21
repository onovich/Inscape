using System.Collections.Generic;

namespace Inscape.Tooling {

    public sealed class LocalizationLineMapModel {

        public string Format { get; set; } = "inscape.localization-line-map";

        public int FormatVersion { get; set; } = 1;

        public List<LocalizationLineMapDocumentModel> Documents { get; set; } = new List<LocalizationLineMapDocumentModel>();

        public string LastRefreshedAt { get; set; } = string.Empty;

    }

    public sealed class LocalizationLineMapDocumentModel {

        public string SourcePath { get; set; } = string.Empty;

        public List<LocalizationLineMapBlockModel> Blocks { get; set; } = new List<LocalizationLineMapBlockModel>();

    }

    public sealed class LocalizationLineMapBlockModel {

        public string BlockId { get; set; } = string.Empty;

        public string BlockTitle { get; set; } = string.Empty;

        public List<LocalizationLineMapEntryModel> Lines { get; set; } = new List<LocalizationLineMapEntryModel>();

    }

    public sealed class LocalizationLineMapEntryModel {

        public string LineId { get; set; } = string.Empty;

        public int LineNumber { get; set; }

        public string Kind { get; set; } = string.Empty;

        public string Speaker { get; set; } = string.Empty;

        public string Text { get; set; } = string.Empty;

        public string Fingerprint { get; set; } = string.Empty;

    }

    public sealed class LocalizationLineRefreshResultModel {

        public LocalizationLineMapModel LineMap { get; set; } = new LocalizationLineMapModel();

        public LocalizationLineRefreshReportModel Report { get; set; } = new LocalizationLineRefreshReportModel();

    }

    public sealed class LocalizationLineRefreshReportModel {

        public string Format { get; set; } = "inscape.localization-line-refresh";

        public int FormatVersion { get; set; } = 1;

        public List<LocalizationLineRefreshBlockModel> Blocks { get; set; } = new List<LocalizationLineRefreshBlockModel>();

    }

    public sealed class LocalizationLineRefreshBlockModel {

        public string BlockId { get; set; } = string.Empty;

        public string SourcePath { get; set; } = string.Empty;

        public List<LocalizationLineRefreshChangeModel> Changes { get; set; } = new List<LocalizationLineRefreshChangeModel>();

    }

    public sealed class LocalizationLineRefreshChangeModel {

        public string Kind { get; set; } = string.Empty;

        public string LineId { get; set; } = string.Empty;

        public int LineNumber { get; set; }

        public int OldLineNumber { get; set; }

        public string Text { get; set; } = string.Empty;

        public string OldText { get; set; } = string.Empty;

        public string NewText { get; set; } = string.Empty;

    }

}
