# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative and uses the repository CLI for compiler-backed diagnostics.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights node headers, dialogue speakers, narration, choices, jumps, metadata lines, inline tags, and invalid node or jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, and inline tags.
- Keeps metadata and inline tags on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics by invoking `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>`.
- Provides workspace node completions in jump target positions.
- Provides dialogue speaker completions from `inscape.config.json` `bird.roleMap`, with workspace speaker fallback.
- Provides host binding alias completions from `inscape.config.json` `bird.bindingMap` for `@timeline ...` and `[kind: ...]` inline tag positions.
- Supports Go to Definition / Ctrl+Click from jump targets to node declarations, and from dialogue speakers to configured role-map rows.
- Supports Find All References from node declarations, jump targets, and dialogue speakers.
- Shows hover summaries for node declarations, jump targets, dialogue speakers, and host binding aliases.
- Provides an outline view backed by visible node headers.
- Exposes command palette actions for localization:
  - `Inscape: Export Localization CSV`
  - `Inscape: Update Localization CSV From Previous Table`

## Development Use

Open this folder as an extension development host, or launch VSCode with:

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

This package is not published yet. Later stages should add a language server that reuses `Inscape.Core` for diagnostics, completion, symbols, and definition/reference navigation.

Localization commands invoke:

```powershell
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- extract-l10n-project <workspace> -o <csv>
dotnet run --project src\Inscape.Cli\Inscape.Cli.csproj -- update-l10n-project <workspace> --from <old-csv> -o <csv>
```

If the active `.inscape` document is unsaved and belongs to the selected workspace, the extension passes it to the CLI with `--override` so the generated CSV reflects editor contents.

Speaker completion reads `inscape.config.json` from the workspace root and resolves `bird.roleMap` relative to that file. The role map format is:

```csv
speaker,roleId
旁白,1050
```

When no configured role map exists, the extension still scans open and workspace `.inscape` files for existing dialogue speakers.

Ctrl+Click on a dialogue speaker jumps to the matching `speaker` row in the configured role map. Find All References on a speaker lists all matching dialogue lines in the workspace and includes the role-map row when VSCode requests declarations.

Host binding completion reads `bird.bindingMap` from the same project config. The binding map format is:

```csv
kind,alias,birdId,unityGuid,addressableKey,assetPath
timeline,court_intro,12,,Timeline/CourtIntro,Assets/Resources_Runtime/Timeline/SO_Timeline_CourtIntro.asset
```

The first supported contexts are `@timeline court_intro` and inline tags such as `[timeline: court_intro]` or `[bg: classroom]`. For inline tags, completion is generic by `kind`, but the compiler still only gives special Bird export meaning to supported hooks such as `timeline`.

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
