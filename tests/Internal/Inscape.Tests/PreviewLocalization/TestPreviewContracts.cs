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

        static void CliPreviewProjectEmitsHtml() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
# start
@entry
Narrator: Start.
-> second.node
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
# second.node
Narrator: Second page.
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliCore.Main(new[] { "preview-project", directory });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
            }

            string html = output.ToString();
            AssertEqual(0, exitCode, "Preview-project command exit code");
            AssertEqual("", error.ToString().Trim(), "Preview-project command stderr");
            AssertTrue(html.Contains("<!doctype html>"), "Preview-project should emit HTML.");
            AssertTrue(html.Contains("inscape.project-ir"), "Preview-project should embed project IR.");
            AssertTrue(html.Contains("second.node"), "Preview-project should include project nodes.");
            AssertTrue(html.Contains("const graph = data.graph ?? data.document;"), "Preview-project should use graph fallback.");
            AssertTrue(html.Contains("const entryName = data.entryNodeName ?? '';"), "Preview-project should read project entry.");
        }


        static void CliPreviewProjectAppliesEntryOverride() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "00-start.inscape"), """
# start
@entry
Narrator: Default entry.
""", Encoding.UTF8);
            File.WriteAllText(Path.Combine(directory, "01-second.inscape"), """
# second.node
Narrator: Temporary entry.
-> start
""", Encoding.UTF8);

            TextWriter originalOut = Console.Out;
            TextWriter originalError = Console.Error;
            StringWriter output = new StringWriter();
            StringWriter error = new StringWriter();

            int exitCode;
            try {
                Console.SetOut(output);
                Console.SetError(error);
                exitCode = CliCore.Main(new[] { "preview-project", directory, "--entry", "second.node" });
            } finally {
                Console.SetOut(originalOut);
                Console.SetError(originalError);
                Directory.Delete(directory, true);
            }

            string html = output.ToString();
            AssertEqual(0, exitCode, "Preview-project entry override command exit code");
            AssertEqual("", error.ToString().Trim(), "Preview-project entry override stderr");
            AssertTrue(html.Contains("\"entryNodeName\": \"second.node\""), "Preview-project should serialize entry override.");
        }


        static void PreviewHtmlConvertsCompilerSourceCoordinates() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Source mapped line.
""", Encoding.UTF8);

            string html;
            try {
                html = RunCliForOutput(new[] { "preview-project", directory });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(html.Contains("function sourcePayload(source) { return source && source.sourcePath ? { sourcePath: source.sourcePath, line: Math.max(0, (source.line ?? 1) - 1), character: Math.max(0, (source.column ?? 1) - 1) }"), "Preview should convert Compiler 1-based source coordinates before editor reveal.");
            AssertTrue(html.Contains("function editorSourcePayload(source)"), "Preview should keep editor reveal payloads separate from Compiler source payloads.");
            AssertTrue(html.Contains("character: Math.max(0, (source.character ?? source.column ?? 0))"), "Preview should prefer character and keep column only as fallback.");
            AssertTrue(html.Contains("button.onclick = event => { event.stopPropagation(); openSource(payload); };"), "Preview source button should post the converted editor payload.");
            AssertTrue(html.Contains("character: Math.max(0, (d.column ?? 1) - 1)"), "Preview diagnostics source jump should emit editor character.");
            AssertTrue(html.Contains("pill.onclick = () => openSource(sourcePayload(line.source));"), "Preview metadata source jump should use converted source payload.");
        }


        static void PreviewHtmlStylesQueryInterpolationTokens() {
            string directory = Path.Combine(Path.GetTempPath(), "inscape-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directory);

            File.WriteAllText(Path.Combine(directory, "story.inscape"), """
# start
@entry
Narrator: Gold [player.gold].
? Spend [player.gold]?
  - Buy with [player.gold] -> start
""", Encoding.UTF8);

            string html;
            try {
                html = RunCliForOutput(new[] { "preview-project", directory });
            } finally {
                Directory.Delete(directory, true);
            }

            AssertTrue(html.Contains(".query-interpolation"), "Preview should style query interpolation tokens.");
            AssertTrue(html.Contains("Content-Security-Policy"), "Preview HTML should include a content security policy.");
            AssertTrue(html.Contains("function appendPreviewText(parent, value)"), "Preview should render text through interpolation-aware fragments.");
            AssertTrue(html.Contains("appendPreviewText(paragraph, line.text);"), "Preview dialogue should use interpolation-aware rendering.");
            AssertTrue(html.Contains("appendPreviewText(prompt, group.prompt);"), "Preview choice prompts should use interpolation-aware rendering.");
            AssertTrue(html.Contains("appendPreviewText(button, option.text);"), "Preview choice options should use interpolation-aware rendering.");
        }


        static void PreviewSourceControllerKeepsColumnFallback() {
            string controller = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Controllers/PreviewSourceController.js"));

            AssertTrue(controller.Contains("const character = Math.max(0, (source.character ?? source.column ?? 0));"), "Preview source controller should prefer character while accepting old column payloads.");
            AssertTrue(controller.Contains("new this.vscode.Range(\n                    line,\n                    character,\n                    line,\n                    character + 1"), "Preview source controller should use normalized editor coordinates.");
        }


        static void PreviewRevealBridgeTrimsChoicePrefixesFromLinkRange() {
            string bridge = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Bridges/PreviewRevealBridge.js"));
            string syncScript = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/DevScripts/PreviewSourceSyncContractCheck.js"));

            AssertTrue(bridge.Contains("const promptRange = this.trimRange(line, choicePromptMatch[1].length, line.length);"), "Choice prompt transient link range should start after the '? ' prefix.");
            AssertTrue(bridge.Contains("const displayRange = this.trimRange(line, optionStart, optionEnd);"), "Choice option transient link range should start after the '- ' prefix.");
            AssertTrue(syncScript.Contains("Choice-option prefix area must not participate in preview reveal hit testing."), "Preview source sync contract should guard option prefix hover behavior.");
            AssertTrue(syncScript.Contains("Choice prompt prefix must not expose transient link range."), "Preview source sync contract should guard prompt prefix hover behavior.");
        }


        static void PreviewHtmlProviderAddsCspToFallbackPages() {
            string providerSource = File.ReadAllText(RepositoryFile("src/ExternalSupport/VSCode/Scripts/Preview/Providers/PreviewHtmlProvider.js"));

            AssertTrue(providerSource.Contains("Content-Security-Policy"), "Preview HTML provider should add CSP to loading and error pages.");
            AssertTrue(providerSource.Contains("default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"), "Preview HTML provider should use restrictive fallback CSP.");
        }
    }
}
