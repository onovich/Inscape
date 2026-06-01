# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative, uses a persistent `Inscape.LanguageServer` session for high-frequency language features, and keeps CLI fallbacks for failure recovery.

## Boundary

This package is first-party maintained, but it is bound to the VSCode platform. It belongs directly under `src/ExternalSupport/VSCode`: do not add an `EditorExtensions` category layer, and do not add a nested `vscode-inscape` package-name directory. Shared editor-neutral semantics should move to Internal `LanguageServer` / `Tooling` contracts.

The package is also a future split-repo candidate, so non-source extension assets live under `Resources`. The current `DevScripts` directory is only a transitional bucket for package-local development scripts until the full `Resources / Scripts` code-side migration is complete; do not treat `DevScripts` as the long-term code-side parent that the naming convention reserves for independent module source.

`Scripts/ExtensionManifestEntry.js` is the narrow VSCode manifest main entry declared by `package.json`. It should stay limited to activation, dependency assembly, and registration glue; feature behavior belongs under business directories such as `Scripts/Entries`, `Scripts/DslScript`, `Scripts/Localization`, `Scripts/Preview`, `Scripts/EditorAuthoring`, `Scripts/HostSchema`, and `Scripts/HostBinding` in the current migration stage.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights `# 标题` node headers, dialogue speakers, narration, choices, jumps, metadata lines, query interpolations, and invalid jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, timeline hooks, and query interpolations.
- Keeps metadata and query interpolations on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics through a persistent `Inscape.LanguageServer` session first, then falls back to the configured CLI `diagnose-project` invocation if the session is unavailable.
- Provides node completions in jump target positions through the same persistent `Inscape.LanguageServer` session, including cross-file nodes and unsaved editor content.
- Guards the LanguageServer-backed authoring surface with `check:semantic-parity`, which exercises diagnostics, node completion, definition, references, hover, and document symbols through VSCode providers against the same current-draft and cross-file fixture used by the SelfHostedEditor parity smoke.
- Provides `Inscape: Insert Node Title`; if the requested title already exists, the command inserts the next `_01`-style title and, when the file belongs to a workspace, silently refreshes the stable node map through `update-node-map-project`.
- Provides `Inscape: Update Stable Node Map`; it runs `update-node-map-project` for the selected workspace, forwards the active unsaved `.inscape` file through `--override`, and surfaces a review hint when the update report contains manual review or conflict items.
- Provides `Inscape: Review Stable Node Map Changes`; it runs the same update flow with `--report`, then opens a JSON review report for rename/manual-review/conflict/missing inspection.
- Provides dialogue speaker completions from `inscape.config.json` `hostBridge`, with workspace speaker fallback.
- Provides host event / timing hook completions from `inscape.config.json` `hostBridge`, with workspace `@timeline...` fallback.
- Provides `[]` query interpolation completions and Hover from configured Host Schema zero-parameter simple queries such as `[player.gold]`; unknown queries are authoring hints only, not compiler errors. The provider prefers the persistent LanguageServer Host Schema capability session path, falls back to CLI `inspect-host-schema-project`, and does not parse Host Schema JSON directly in JS.
- Provides `@emit` host event completions and Hover from configured Host Schema `events[]`; unknown events are authoring hints only, not compiler errors. This uses the same LanguageServer-first capability session path with CLI fallback and does not parse Host Schema JSON directly in JS.
- Highlights host hook lines such as `@timeline court_intro` without the always-on link look, while Hover / Ctrl+Click still jumps to the matching mapping row or workspace occurrence.
- Supports Go to Definition / Ctrl+Click from jump targets to node declarations through the persistent LanguageServer session, and from dialogue speakers to configured Host Bridge speaker rows or dialogue references; the clickable text stays visually plain until Ctrl is held.
- Treats full-width colons and common Chinese punctuation as word boundaries so Ctrl+Click link styling on Chinese dialogue only covers the speaker name.
- Supports Find All References from node declarations and jump targets through the persistent LanguageServer session; dialogue speaker references remain a VSCode authoring scan.
- Shows node CodeLens entries as `N 个引用` on the referenced block header; clicking opens VSCode References Peek for incoming jumps.
- Shows node declaration and jump target hover through the persistent LanguageServer session; dialogue speaker and host binding hover remain VSCode authoring hints.
- Provides an outline view through the persistent LanguageServer session.
- Provides JSON validation for `inscape.host.schema.json` / `*.host.schema.json`.
- Exposes command palette actions for localization:
  - `Inscape: Open Preview`
  - `Inscape: Insert Node Title`
  - `Inscape: Update Stable Node Map`
  - `Inscape: Review Stable Node Map Changes`
  - `Inscape: Export Localization CSV`
  - `Inscape: Update Localization CSV From Previous Table`
- Exposes command palette action for host schema inspection:
  - `Inscape: Show Host Schema Capabilities`
- Adds an editor-title icon button for `Inscape: Toggle Preview`, plus an `Inscape` drop-down menu with entries for editor style, preview style, and the quick syntax guide.

## Quick Authoring Guide

- `# 标题` starts a dialogue block.
- `角色：文本` writes dialogue; `旁白：文本` works the same way.
- `? 提示` starts a choice prompt.
- `- 选项 -> 目标标题` adds a choice.
- `-> 目标标题` jumps directly.

Style tweaking is file-based: point `inscape.config.json` at an editor style JSON and a preview style JSON, then adjust plain values such as colors, font sizes, and radii.

## Development Use

Open this folder as an extension development host, or launch VSCode with:

```powershell
code --extensionDevelopmentPath=src\ExternalSupport\VSCode .
```

This package is not published yet. The current extension already reuses `Inscape.LanguageServer` for diagnostics, completion, symbols, definition/reference navigation, hover, and Host Schema capability reads through a persistent stdio session. The remaining migration and fallback boundaries are tracked in `docs/vscode-language-server-migration-plan.md`.

Preview command opens a VSCode custom editor beside the current source editor when possible:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- preview-project <workspace> -o <preview.html>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the preview reflects editor contents. Once a preview editor is open, saving any `.inscape` file in that workspace refreshes it automatically, and typing uses a short debounce so it still feels lightweight. The extension prefers a compiled CLI DLL when one is already present, which keeps preview startup closer to an editor-like experience. The preview itself now uses a single immersive story pane: click choices to branch, click the text body to continue when there is only a default next node, and use Back / Restart to revisit the flow. Compiler diagnostics do not block preview rendering; preview remains a CLI path even though language features now use a persistent LanguageServer session.

During debounce and refresh, the preview webview displays small `等待刷新...` / `刷新中...` statuses. These are VSCode webview messages only; they do not change story state, path history, or compiler output.

Preview nodes, dialogue lines, choices, metadata tags, and diagnostics include a source jump affordance. Clicking the source badge opens the matching location in the editor so you can move between gameplay flow and script edits quickly.

Dialogue, narration, prompt, and choice text inside the editor deliberately do not use `DocumentLinkProvider`. That provider made long text ranges render like always-on links, which caused persistent underline regressions. The stable pattern is: `DefinitionProvider` supplies the transient Ctrl+hover link affordance, and a short-lived selection bridge turns the resulting Ctrl+Click into preview reveal navigation. If you touch this area, rebuild and reinstall the `.vsix` before judging the result; reloading the window alone is not enough.

`inscape.preview.sourceSyncMode` controls how editor-side source navigation talks to an open preview. `click` is the default and keeps the current behavior: supported text ranges reveal preview on Ctrl+Click, and the explicit `Inscape: Reveal Current Selection In Preview` command still works. On choice lines such as `- 选项 -> 目标标题`, the option label before `->` is the preview-reveal area, while the target title after `->` remains Go to Definition. `selection` adds passive follow mode for an already-open preview, so changing the source-editor text selection updates preview focus without opening a new panel or forcing a re-render. `off` disables the preview text Ctrl+Click reveal path and leaves only explicit preview commands.

## Regression Checklist

Any change under `src/ExternalSupport/VSCode/` must be checked with the repository workflow in `docs/regression-workflow.md`.

Run the static checks:

```powershell
node --check src\ExternalSupport\VSCode\Scripts\ExtensionManifestEntry.js
npm --prefix src\ExternalSupport\VSCode run check:diagnostics-fallback
npm --prefix src\ExternalSupport\VSCode run check:preview-navigation
npm --prefix src\ExternalSupport\VSCode run check:preview-source-sync
npm --prefix src\ExternalSupport\VSCode run check:semantic-parity
npm --prefix src\ExternalSupport\VSCode run check:structure
node -e "JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Language/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Syntaxes/inscape.tmLanguage.json','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Snippets/inscape.code-snippets','utf8')); JSON.parse(require('fs').readFileSync('src/ExternalSupport/VSCode/Resources/Schemas/host-schema.schema.json','utf8')); console.log('json ok')"
```

If a split module changed, run `node --check` on that module too.

Then rebuild and install the extension:

```powershell
cd src\ExternalSupport\VSCode
npm run rebuild:vsix
```

After installation, reload the VSCode window before judging behavior. Manual smoke checks:

For `inscape.preview.sourceSyncMode`, prefer the repeatable launcher in [docs/vscode-preview-source-sync-smoke.md](../../../docs/vscode-preview-source-sync-smoke.md):

```powershell
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode off
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode click
npm --prefix src\ExternalSupport\VSCode run smoke:preview-source-sync -- -Mode selection
```

Run one mode per VSCode window. Close the previous smoke window before starting the next mode so the workspace setting does not contaminate the result.

- Dialogue, narration, prompt, and choice text show no always-on underline.
- Holding Ctrl over dialogue / option text shows the transient link affordance.
- Ctrl+Click on dialogue / option text opens or reuses preview and reveals the matching page.
- `-> target` Go to Definition and Find All References are served by LanguageServer project navigation and still work across files.
- `# 标题` appears in highlighting, Outline, jump completion, Go to Definition, Find All References, Hover, and node CodeLens; node / jump Hover is served by LanguageServer project hover.
- Outline is served by LanguageServer; if that probe fails, the view is empty rather than using a duplicate JS semantic scanner.
- Jump target node completion is served by LanguageServer project completion, including cross-file authoring and unsaved current document content.
- Speaker completion, Hover, Go to Definition, and Find All References prefer `hostBridge` and fall back to workspace dialogue references.
- `@timeline ...` host event / timing hook completion, Hover, and Ctrl+Click prefer `hostBridge` and fall back to workspace `@timeline...` occurrences.
- `[query.path]` query interpolation completion and Hover read Host Schema queries.
- `@emit eventName` completion and Hover read Host Schema events through the same LanguageServer-first capability endpoint as query interpolation and remain separate from `@timeline` Host Bridge bindings.
- Preview source buttons, diagnostics clicks, and metadata clicks still jump to the expected source location.

If the environment cannot perform the manual click checks, say so in the handoff or final report instead of implying they were completed.

Localization commands invoke:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the generated CSV reflects editor contents.

Stable node map command invokes:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-node-map-project <workspace>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so `inscape.node-map.json` reflects editor contents before save.

Stable node map review uses the same command with an explicit report file:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-node-map-project <workspace> --report <report.json>
```

The current review report is a JSON audit artifact. It lists conservative auto-renames, brand-new ids, missing nodes, sidecar conflicts, and manual-review rename candidates. VSCode does not rename titles for the author yet; this step only gives the author a narrow inspection entry before Goal 10.3 localization alignment work.

Speaker completion reads `inscape.config.json` from the workspace root. It prefers `hostBridge` ids with `kind: "speaker"`. When no Host Bridge row exists, the extension still scans open and workspace `.inscape` files for existing dialogue speakers.

Ctrl+Click on a dialogue speaker jumps to the matching `speaker` entry in the configured Host Bridge. If no configured row exists, it falls back to matching dialogue lines in the workspace. Find All References on a speaker lists all matching dialogue lines in the workspace and includes the Host Bridge row when VSCode requests declarations.

Host hook completion prefers `hostBridge` ids whose `kind` matches the authoring context.

The supported contexts are host event / timing hooks such as `@timeline court_intro` and `@timeline.node.enter court_intro`. Hover explains `@entry` / `@scene` metadata lines, while Ctrl+Click on `@timeline ...` opens the corresponding bridge entry or first workspace occurrence when one exists. Compiler semantics come from `Inscape.Compiler`, while UnitySample export remains an experimental adapter.

Host schema files named `inscape.host.schema.json` or `*.host.schema.json` are validated by the bundled JSON Schema. The command `Inscape: Show Host Schema Capabilities` reads `inscape.config.json` `hostSchema`, lists configured queries/events, and opens the selected capability in the schema file.

Script authoring also reads the same configured Host Schema for `[]` query interpolation hints. In text such as `[player.gold]`, completion offers zero-parameter simple query names and Hover shows `returnType`, `isAsync`, description, and schema source. Unknown query Hover is deliberately informational: it means the current Host Schema did not declare that query, not that `Inscape.Compiler` rejects the script.

For host events, `@emit eventName` completion offers Host Schema `events[]` names and Hover shows delivery, side effect, parameter, description, and schema source information. This is still an authoring hint: `Inscape.Compiler` keeps treating the line as metadata, and `@timeline...` keeps using Host Bridge data because it references a timed host resource hook rather than a generic schema event.

The query and event providers prefer the persistent LanguageServer capability session path, then fall back to the Internal CLI endpoint:

```powershell
dotnet run --project src\Internal\LanguageServer\Inscape.LanguageServer.csproj -- --host-schema-capabilities-project <workspace>
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project <workspace>
```

If both endpoints cannot run, VSCode leaves query / event hints empty and logs the failure to the Inscape output channel. It does not parse Host Schema JSON directly in query / event providers.

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.diagnostics.backend`: chooses `languageServer` first with compiler fallback, or `compiler` only.
- `inscape.preview.sourceSyncMode`: chooses `off`, `click`, or `selection` for editor-to-preview sync.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
