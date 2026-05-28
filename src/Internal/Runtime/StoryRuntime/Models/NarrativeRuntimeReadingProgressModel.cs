namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeReadingProgressModel {

        public int ContentStepCount { get; set; }

        public int MaxVisibleStepCount { get; set; }

        public int VisibleStepCount { get; set; }

        public bool CanAdvance { get; set; }

        public bool CanRewind { get; set; }

        public bool IsChoiceStageVisible { get; set; }

        public bool IsContinueStageVisible { get; set; }

    }

}
