using System.Collections.Generic;

namespace Inscape.Core.Model {

    public sealed class NarrativeNode {

        public string Name { get; set; }

        public SourceSpan Source { get; set; }

        public List<NarrativeLine> Lines { get; set; }

        public List<ChoiceGroup> Choices { get; set; }

        public string DefaultNext { get; set; }

        public NarrativeNode() {
            Name = string.Empty;
            Source = SourceSpan.Empty;
            Lines = new List<NarrativeLine>();
            Choices = new List<ChoiceGroup>();
            DefaultNext = string.Empty;
        }

    }

}
