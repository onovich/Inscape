using Inscape.Adapters.UnitySample;

namespace Inscape.Tests {

    public static partial class TestCore {

        static void AddTimelineBinding(UnitySampleExportOptions options, string alias, int unitySampleId) {
            options.HostBindings.Add(new UnitySampleHostBinding {
                Kind = "timeline",
                Alias = alias,
                UnitySampleId = unitySampleId,
            });
        }

        static int CountCsvLines(string csv) {
            int count = 0;
            using StringReader reader = new StringReader(csv);
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Length > 0) {
                    count += 1;
                }
            }
            return count;
        }

        static void AssertTrue(bool value, string message) {
            if (!value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertFalse(bool value, string message) {
            if (value) {
                throw new InvalidOperationException(message);
            }
        }

        static void AssertEqual<T>(T expected, T actual, string message) {
            if (!EqualityComparer<T>.Default.Equals(expected, actual)) {
                throw new InvalidOperationException(message + ". Expected: " + expected + ", Actual: " + actual);
            }
        }
    }
}
