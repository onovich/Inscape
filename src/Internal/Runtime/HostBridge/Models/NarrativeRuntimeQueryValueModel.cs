namespace Inscape.Runtime {

    public sealed class NarrativeRuntimeQueryValueModel {

        public NarrativeRuntimeQueryValueKindModel Kind { get; set; }

        public string StringValue { get; set; }

        public double NumberValue { get; set; }

        public bool BoolValue { get; set; }

        public NarrativeRuntimeQueryValueModel() {
            StringValue = string.Empty;
        }

        public static NarrativeRuntimeQueryValueModel FromString(string value) {
            return new NarrativeRuntimeQueryValueModel {
                Kind = NarrativeRuntimeQueryValueKindModel.String,
                StringValue = value,
            };
        }

        public static NarrativeRuntimeQueryValueModel FromNumber(double value) {
            return new NarrativeRuntimeQueryValueModel {
                Kind = NarrativeRuntimeQueryValueKindModel.Number,
                NumberValue = value,
            };
        }

        public static NarrativeRuntimeQueryValueModel FromBool(bool value) {
            return new NarrativeRuntimeQueryValueModel {
                Kind = NarrativeRuntimeQueryValueKindModel.Bool,
                BoolValue = value,
            };
        }

    }

}
