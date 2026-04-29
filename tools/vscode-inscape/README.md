# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative and uses the repository CLI for compiler-backed diagnostics.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights node headers, dialogue speakers, narration, choices, jumps, metadata lines, inline tags, and invalid node or jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, and inline tags.
- Keeps metadata and inline tags on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics by invoking `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>`.
- Provides workspace node completions in jump target positions.
- Supports Go to Definition / Ctrl+Click from jump targets to node declarations.
- Supports Find All References from node declarations and jump targets.
- Shows hover summaries for node declarations and jump targets.
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

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
