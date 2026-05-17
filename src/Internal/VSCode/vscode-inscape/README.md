# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative and uses the repository CLI for compiler-backed diagnostics.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights `# 标题` node headers, dialogue speakers, narration, choices, jumps, metadata lines, query interpolations, and invalid jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, timeline hooks, and query interpolations.
- Keeps metadata and query interpolations on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics through `Inscape.LanguageServer --diagnose-project <workspace> --override <source> <temp-file>` first, then falls back to the configured CLI `diagnose-project` invocation if the LanguageServer probe is unavailable.
- Provides node completions in jump target positions through `Inscape.LanguageServer --completion-file`, with JS workspace node fallback for cross-file nodes and probe failures.
- Provides `Inscape: Insert Node Title`; if the requested title already exists, the command inserts the next `_01`-style title.
- Provides dialogue speaker completions from `inscape.config.json` `hostBridge`, with workspace speaker fallback.
- Provides host event / timing hook completions from `inscape.config.json` `hostBridge`, with workspace `@timeline...` fallback.
- Provides `[]` query interpolation completions and Hover from configured Host Schema zero-parameter simple queries such as `[player.gold]`; unknown queries are authoring hints only, not compiler errors. The provider prefers the CLI `inspect-host-schema-project` capability endpoint and falls back to direct JSON reading if the endpoint is unavailable.
- Provides `@emit` host event completions and Hover from configured Host Schema `events[]`; unknown events are authoring hints only, not compiler errors. This uses the same capability endpoint with direct JSON fallback.
- Highlights host hook lines such as `@timeline court_intro` without the always-on link look, while Hover / Ctrl+Click still jumps to the matching mapping row or workspace occurrence.
- Supports Go to Definition / Ctrl+Click from jump targets to node declarations, and from dialogue speakers to configured Host Bridge speaker rows or dialogue references; the clickable text stays visually plain until Ctrl is held.
- Treats full-width colons and common Chinese punctuation as word boundaries so Ctrl+Click link styling on Chinese dialogue only covers the speaker name.
- Supports Find All References from node declarations, jump targets, and dialogue speakers.
- Shows node CodeLens entries as `N 个引用` on the referenced block header; clicking opens VSCode References Peek for incoming jumps.
- Shows concise hover summaries for node declarations, jump targets, dialogue speakers, and host binding aliases.
- Provides an outline view that prefers `Inscape.LanguageServer --document-symbols-file` and falls back to visible node-header scanning when the probe is unavailable.
- Provides JSON validation for `inscape.host.schema.json` / `*.host.schema.json`.
- Exposes command palette actions for localization:
  - `Inscape: Open Preview`
  - `Inscape: Insert Node Title`
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
code --extensionDevelopmentPath=src\Internal\VSCode\vscode-inscape .
```

This package is not published yet. Later stages should add a language server that reuses `Inscape.Compiler` for diagnostics, completion, symbols, and definition/reference navigation. The migration order and fallback boundaries are tracked in `docs/vscode-language-server-migration-plan.md`.

Preview command opens a VSCode custom editor beside the current source editor when possible:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- preview-project <workspace> -o <preview.html>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the preview reflects editor contents. Once a preview editor is open, saving any `.inscape` file in that workspace refreshes it automatically, and typing uses a short debounce so it still feels lightweight. The extension prefers a compiled CLI DLL when one is already present, which keeps preview startup closer to an editor-like experience. The preview itself now uses a single immersive story pane: click choices to branch, click the text body to continue when there is only a default next node, and use Back / Restart to revisit the flow. Compiler diagnostics do not block preview rendering; the CLI still emits HTML and the editor keeps showing it.

Preview nodes, dialogue lines, choices, metadata tags, and diagnostics include a source jump affordance. Clicking the source badge opens the matching location in the editor so you can move between gameplay flow and script edits quickly.

Dialogue, narration, prompt, and choice text inside the editor deliberately do not use `DocumentLinkProvider`. That provider made long text ranges render like always-on links, which caused persistent underline regressions. The stable pattern is: `DefinitionProvider` supplies the transient Ctrl+hover link affordance, and a short-lived selection bridge turns the resulting Ctrl+Click into preview reveal navigation. If you touch this area, rebuild and reinstall the `.vsix` before judging the result; reloading the window alone is not enough.

## Regression Checklist

Any change under `src/Internal/VSCode/vscode-inscape/` must be checked with the repository workflow in `docs/regression-workflow.md`.

Run the static checks:

```powershell
node --check src\Internal\VSCode\vscode-inscape\extension.js
node -e "JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/package.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/language-configuration.json','utf8')); JSON.parse(require('fs').readFileSync('src/Internal/VSCode/vscode-inscape/syntaxes/inscape.tmLanguage.json','utf8')); console.log('json ok')"
```

If a split module changed, run `node --check` on that module too.

Then rebuild and install the extension:

```powershell
cd src\Internal\VSCode\vscode-inscape
npm run rebuild:vsix
```

After installation, reload the VSCode window before judging behavior. Manual smoke checks:

- Dialogue, narration, prompt, and choice text show no always-on underline.
- Holding Ctrl over dialogue / option text shows the transient link affordance.
- Ctrl+Click on dialogue / option text opens or reuses preview and reveals the matching page.
- `-> target` Go to Definition and Find All References still work.
- `# 标题` appears in highlighting, Outline, jump completion, Go to Definition, Find All References, Hover, and node CodeLens.
- Outline is served by LanguageServer first; if that probe fails, the extension falls back to the JS node scanner instead of breaking the view.
- Jump target node completion is served by LanguageServer first, then augmented by the JS workspace scanner so cross-file authoring remains available.
- Speaker completion, Hover, Go to Definition, and Find All References prefer `hostBridge` and fall back to workspace dialogue references.
- `@timeline ...` host event / timing hook completion, Hover, and Ctrl+Click prefer `hostBridge` and fall back to workspace `@timeline...` occurrences.
- `[query.path]` query interpolation completion and Hover read Host Schema queries.
- `@emit eventName` completion and Hover read Host Schema events and remain separate from `@timeline` Host Bridge bindings.
- Preview source buttons, diagnostics clicks, and metadata clicks still jump to the expected source location.

If the environment cannot perform the manual click checks, say so in the handoff or final report instead of implying they were completed.

Localization commands invoke:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the generated CSV reflects editor contents.

Speaker completion reads `inscape.config.json` from the workspace root. It prefers `hostBridge` ids with `kind: "speaker"`. When no Host Bridge row exists, the extension still scans open and workspace `.inscape` files for existing dialogue speakers.

Ctrl+Click on a dialogue speaker jumps to the matching `speaker` entry in the configured Host Bridge. If no configured row exists, it falls back to matching dialogue lines in the workspace. Find All References on a speaker lists all matching dialogue lines in the workspace and includes the Host Bridge row when VSCode requests declarations.

Host hook completion prefers `hostBridge` ids whose `kind` matches the authoring context.

The supported contexts are host event / timing hooks such as `@timeline court_intro` and `@timeline.node.enter court_intro`. Hover explains `@entry` / `@scene` metadata lines, while Ctrl+Click on `@timeline ...` opens the corresponding bridge entry or first workspace occurrence when one exists. Compiler semantics come from `Inscape.Compiler`, while UnitySample export remains an experimental adapter.

Host schema files named `inscape.host.schema.json` or `*.host.schema.json` are validated by the bundled JSON Schema. The command `Inscape: Show Host Schema Capabilities` reads `inscape.config.json` `hostSchema`, lists configured queries/events, and opens the selected capability in the schema file.

Script authoring also reads the same configured Host Schema for `[]` query interpolation hints. In text such as `[player.gold]`, completion offers zero-parameter simple query names and Hover shows `returnType`, `isAsync`, description, and schema source. Unknown query Hover is deliberately informational: it means the current Host Schema did not declare that query, not that `Inscape.Compiler` rejects the script.

For host events, `@emit eventName` completion offers Host Schema `events[]` names and Hover shows delivery, side effect, parameter, description, and schema source information. This is still an authoring hint: `Inscape.Compiler` keeps treating the line as metadata, and `@timeline...` keeps using Host Bridge data because it references a timed host resource hook rather than a generic schema event.

The query and event providers prefer the Internal CLI endpoint:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- inspect-host-schema-project <workspace>
```

If that endpoint cannot run, VSCode falls back to direct Host Schema JSON reading so basic authoring still works in extension-development and partially built environments.

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.diagnostics.backend`: chooses `languageServer` first with compiler fallback, or `compiler` only.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
