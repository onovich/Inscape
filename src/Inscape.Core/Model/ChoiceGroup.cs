using System.Collections.Generic;

namespace Inscape.Core.Model {

    public sealed class ChoiceGroup {

        public string Prompt { get; set; }

        public SourceSpan Source { get; set; }

        public List<ChoiceOption> Options { get; set; }

        public ChoiceGroup() {
            Prompt = string.Empty;
            Source = SourceSpan.Empty;
            Options = new List<ChoiceOption>();
        }

    }

}
