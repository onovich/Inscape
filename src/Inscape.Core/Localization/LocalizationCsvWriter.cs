using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace Inscape.Core.Localization {

    public sealed class LocalizationCsvWriter {

        public string Write(IReadOnlyList<LocalizationEntry> entries) {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("anchor,node,kind,speaker,text,translation,sourcePath,line,column");

            for (int i = 0; i < entries.Count; i += 1) {
                LocalizationEntry entry = entries[i];
                AppendField(builder, entry.Anchor);
                builder.Append(',');
                AppendField(builder, entry.NodeName);
                builder.Append(',');
                AppendField(builder, entry.Kind);
                builder.Append(',');
                AppendField(builder, entry.Speaker);
                builder.Append(',');
                AppendField(builder, entry.Text);
                builder.Append(',');
                AppendField(builder, string.Empty);
                builder.Append(',');
                AppendField(builder, entry.Source.SourcePath);
                builder.Append(',');
                AppendField(builder, entry.Source.Line.ToString(CultureInfo.InvariantCulture));
                builder.Append(',');
                AppendField(builder, entry.Source.Column.ToString(CultureInfo.InvariantCulture));
                builder.AppendLine();
            }

            return builder.ToString();
        }

        static void AppendField(StringBuilder builder, string value) {
            bool needsQuotes = value.IndexOfAny(new[] { ',', '"', '\r', '\n' }) >= 0;
            if (!needsQuotes) {
                builder.Append(value);
                return;
            }

            builder.Append('"');
            for (int i = 0; i < value.Length; i += 1) {
                char c = value[i];
                if (c == '"') {
                    builder.Append("\"\"");
                } else {
                    builder.Append(c);
                }
            }
            builder.Append('"');
        }

    }

}
