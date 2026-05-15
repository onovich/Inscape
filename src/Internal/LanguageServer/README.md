# LanguageServer

Owns the C# language server baseline that will centralize editor semantics for diagnostics, definitions, references, completion, outline, hover, and source reveal.

Current baseline:

- `Inscape.LanguageServer.csproj` is an executable project in `Inscape.slnx`.
- `Entries/LanguageServerEntry.cs` exposes `--capabilities` so the project has a real, buildable entry point before full LSP transport is introduced.
- `Models/EditorLocationModel.cs` follows `docs/source-location-contracts.md`: editor positions use 0-based `line` / `character` / `length`.

Allowed business areas: `Entries`, `Models`, `DslScript`, `StoryGraph`, and `HostSchema`.

Do not create a broad project service here before narrower Compiler and Tooling contracts are stable.
