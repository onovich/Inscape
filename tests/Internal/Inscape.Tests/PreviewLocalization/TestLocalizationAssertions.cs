using System.Text;
using System.Text.Json;
using System.Linq;
using System.Text.Encodings.Web;
using System.Text.Json.Serialization;
using Inscape.Compiler.Analysis;
using Inscape.Compiler.Compilation;
using Inscape.Compiler.Diagnostics;
using Inscape.Compiler.Model;
using Inscape.Tooling;
using CliCore = Inscape.Cli.CliCore;

namespace Inscape.Tests {

    public static partial class TestCore {

        static LocalizationAlignmentItemModel FindAlignmentItem(LocalizationAlignmentReportModel report, string status) {
            for (int i = 0; i < report.Items.Count; i += 1) {
                if (report.Items[i].Status == status) {
                    return report.Items[i];
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + status);
        }


        static LocalizationAlignmentItemModel FindFirstAlignmentItem(LocalizationAlignmentReportModel report, params string[] statuses) {
            for (int statusIndex = 0; statusIndex < statuses.Length; statusIndex += 1) {
                string status = statuses[statusIndex];
                for (int i = 0; i < report.Items.Count; i += 1) {
                    if (report.Items[i].Status == status) {
                        return report.Items[i];
                    }
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + string.Join(",", statuses));
        }


        static LocalizationAlignmentItemModel FindAlignmentItemByText(LocalizationAlignmentReportModel report, string text, params string[] statuses) {
            for (int statusIndex = 0; statusIndex < statuses.Length; statusIndex += 1) {
                string status = statuses[statusIndex];
                for (int i = 0; i < report.Items.Count; i += 1) {
                    if (report.Items[i].Status == status && report.Items[i].Text == text) {
                        return report.Items[i];
                    }
                }
            }

            throw new InvalidOperationException("Could not find alignment item: " + text);
        }


        static string AnchorForText(string csv, string text) {
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Contains(text, StringComparison.Ordinal)) {
                    int comma = line.IndexOf(',');
                    return comma < 0 ? line : line.Substring(0, comma);
                }
            }

            throw new InvalidOperationException("Could not find CSV text: " + text);
        }


        static string LastAnchorForText(string csv, string text) {
            string result = string.Empty;
            using StringReader reader = new StringReader(csv);
            reader.ReadLine();
            string? line;
            while ((line = reader.ReadLine()) != null) {
                if (line.Contains(text, StringComparison.Ordinal)) {
                    int comma = line.IndexOf(',');
                    result = comma < 0 ? line : line.Substring(0, comma);
                }
            }

            if (string.IsNullOrWhiteSpace(result)) {
                throw new InvalidOperationException("Could not find CSV text: " + text);
            }

            return result;
        }
    }
}
