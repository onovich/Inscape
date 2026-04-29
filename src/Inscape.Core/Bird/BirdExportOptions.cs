namespace Inscape.Core.Bird {

    public sealed class BirdExportOptions {

        public int TalkingIdStart { get; set; }

        public string[] Languages { get; set; }

        public BirdExportOptions() {
            TalkingIdStart = 100000;
            Languages = new[] { "ZH_CN", "EN_US", "ES_ES" };
        }

    }

}
