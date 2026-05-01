# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative and uses the repository CLI for compiler-backed diagnostics.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights node headers, dialogue speakers, narration, choices, jumps, metadata lines, inline tags, and invalid node or jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, and inline tags.
- Keeps metadata and inline tags on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics by invoking `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>`.
- Provides workspace node completions in jump target positions.
- Provides dialogue speaker completions from `inscape.config.json` `unitySample.roleMap`, with workspace speaker fallback.
- Provides host binding alias completions from `inscape.config.json` `unitySample.bindingMap` for `@timeline ...`, `@timeline.<phase> ...`, and `[kind: ...]` inline tag positions.
- Highlights host binding lines such as `@timeline court_intro` and `[bg: courtroom]` without the always-on link look, while Hover / Ctrl+Click still jumps to the matching mapping row or workspace occurrence.
- Supports Go to Definition / Ctrl+Click from jump targets to node declarations, and from dialogue speakers to configured role-map rows with dialogue-reference fallback; the clickable text stays visually plain until Ctrl is held.
- Treats full-width colons and common Chinese punctuation as word boundaries so Ctrl+Click link styling on Chinese dialogue only covers the speaker name.
- Supports Find All References from node declarations, jump targets, and dialogue speakers.
- Shows node CodeLens entries as `N 个引用` on the referenced block header; clicking opens VSCode References Peek for incoming jumps.
- Shows concise hover summaries for node declarations, jump targets, dialogue speakers, and host binding aliases.
- Provides an outline view backed by visible node headers.
- Provides JSON validation for `inscape.host.schema.json` / `*.host.schema.json`.
- Exposes command palette actions for localization:
  - `Inscape: Open Preview`
  - `Inscape: Export Localization CSV`
  - `Inscape: Update Localization CSV From Previous Table`
- Exposes command palette action for host schema inspection:
  - `Inscape: Show Host Schema Capabilities`
- Adds an editor-title icon button for `Inscape: Toggle Preview`, plus an `Inscape` drop-down menu with entries for editor style, preview style, and the quick syntax guide.

## Quick Authoring Guide

- `:: node.name` starts a dialogue block.
- `角色：文本` writes dialogue; `旁白：文本` works the same way.
- `? 提示` starts a choice prompt.
- `- 选项 -> target.node` adds a choice.
- `-> target.node` jumps directly.

Style tweaking is file-based: point `inscape.config.json` at an editor style JSON and a preview style JSON, then adjust plain values such as colors, font sizes, and radii.

## Development Use

Open this folder as an extension development host, or launch VSCode with:

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

This package is not published yet. Later stages should add a language server that reuses `Inscape.Core` for diagnostics, completion, symbols, and definition/reference navigation.

Preview command opens a VSCode custom editor beside the current source editor when possible:

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- preview-project <workspace> -o <preview.html>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the preview reflects editor contents. Once a preview editor is open, saving any `.inscape` file in that workspace refreshes it automatically, and typing uses a short debounce so it still feels lightweight. The extension prefers a compiled CLI DLL when one is already present, which keeps preview startup closer to an editor-like experience. The preview itself now uses a single immersive story pane: click choices to branch, click the text body to continue when there is only a default next node, and use Back / Restart to revisit the flow. Compiler diagnostics do not block preview rendering; the CLI still emits HTML and the editor keeps showing it.

Preview nodes, dialogue lines, choices, metadata tags, and diagnostics include a source jump affordance. Clicking the source badge opens the matching location in the editor so you can move between gameplay flow and script edits quickly.

Dialogue, narration, prompt, and choice text inside the editor deliberately do not use `DocumentLinkProvider`. That provider made long text ranges render like always-on links, which caused persistent underline regressions. The stable pattern is: `DefinitionProvider` supplies the transient Ctrl+hover link affordance, and a short-lived selection bridge turns the resulting Ctrl+Click into preview reveal navigation. If you touch this area, rebuild and reinstall the `.vsix` before judging the result; reloading the window alone is not enough.

Localization commands invoke:

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the generated CSV reflects editor contents.

Speaker completion reads `inscape.config.json` from the workspace root and resolves `unitySample.roleMap` relative to that file. The role map format is:

```csv
speaker,roleId
旁白,1050
```

When no configured role map exists, the extension still scans open and workspace `.inscape` files for existing dialogue speakers.

Ctrl+Click on a dialogue speaker jumps to the matching `speaker` row in the configured role map. If no configured row exists, it falls back to matching dialogue lines in the workspace. Find All References on a speaker lists all matching dialogue lines in the workspace and includes the role-map row when VSCode requests declarations.

Host binding completion reads `unitySample.bindingMap` from the same project config. The binding map format is:

```csv
kind,alias,unitySampleId,unityGuid,addressableKey,assetPath
timeline,court_intro,12,,Timeline/CourtIntro,Assets/Resources_Runtime/Timeline/SO_Timeline_CourtIntro.asset
```

The first supported contexts are `@timeline court_intro`, explicit phase forms such as `@timeline.node.enter court_intro`, and inline tags such as `[timeline: court_intro]`, `[timeline.node.exit: court_outro]`, or `[bg: classroom]`. Hover explains `@entry` / `@scene` metadata lines, while Ctrl+Click on `@timeline ...` and `[kind: alias]` opens the corresponding binding row when one exists. For inline tags, completion is generic by `kind`; compiler semantics still come from `Inscape.Core`, while UnitySample export remains an experimental adapter.

Host schema files named `inscape.host.schema.json` or `*.host.schema.json` are validated by the bundled JSON Schema. The command `Inscape: Show Host Schema Capabilities` reads `inscape.config.json` `hostSchema`, lists configured queries/events, and opens the selected capability in the schema file.

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
