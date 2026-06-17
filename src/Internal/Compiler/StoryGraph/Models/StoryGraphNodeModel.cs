using System.Collections.Generic;

namespace Inscape.Compiler.Model {

    public sealed class StoryGraphNodeModel {

        public string Name { get; set; }

        public SourceSpanModel Source { get; set; }

        public List<DslScriptLineModel> Lines { get; set; }

        public List<DslScriptChoiceGroupModel> Choices { get; set; }

        public List<DslScriptConditionalJumpModel> ConditionalJumps { get; set; }

        public string DefaultNext { get; set; }

        public StoryGraphNodeModel() {
            Name = string.Empty;
            Source = SourceSpanModel.Empty;
            Lines = new List<DslScriptLineModel>();
            Choices = new List<DslScriptChoiceGroupModel>();
            ConditionalJumps = new List<DslScriptConditionalJumpModel>();
            DefaultNext = string.Empty;
        }

    }

}
