# Inscape VSCode Extension

This is the first lightweight authoring layer for `.inscape` scripts. It keeps syntax highlighting declarative and uses the repository CLI for compiler-backed diagnostics.

## Capabilities

- Registers the `inscape` language ID for `.inscape` files.
- Highlights node headers, dialogue speakers, narration, choices, jumps, metadata lines, inline tags, and invalid node or jump target spellings.
- Provides basic snippets for nodes, dialogue, choices, jumps, metadata, and inline tags.
- Keeps metadata and inline tags on comment-like scopes so themes can visually soften them while prose remains readable.
- Refreshes diagnostics by invoking `dotnet run --project src/Inscape.Cli/Inscape.Cli.csproj -- diagnose-project <workspace> --override <source> <temp-file>`.
- Provides workspace node completions in jump target positions.
- Provides an outline view backed by visible node headers.

## Development Use

Open this folder as an extension development host, or launch VSCode with:

```powershell
code --extensionDevelopmentPath=tools\vscode-inscape .
```

This package is not published yet. Later stages should add a language server that reuses `Inscape.Core` for diagnostics, completion, symbols, and definition/reference navigation.

## Settings

- `inscape.diagnostics.enabled`: turns compiler-backed diagnostics on or off.
- `inscape.diagnostics.debounceMs`: changes the refresh delay after edits.
- `inscape.compiler.command`: command used to run the compiler. Defaults to `dotnet`.
- `inscape.compiler.args`: arguments passed to the compiler command. The default path assumes VSCode is opened at the repository root.
