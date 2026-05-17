# LanguageServer

Owns the C# language server baseline that will centralize editor semantics for diagnostics, definitions, references, completion, outline, hover, and source reveal.

Current baseline:

- `Inscape.LanguageServer.csproj` is an executable project in `Inscape.slnx`.
- `Entries/LanguageServerEntry.cs` exposes `--capabilities` so the project has a real, buildable entry point before full LSP transport is introduced.
- `Entries/LanguageServerEntry.cs` also exposes `--diagnose-file <path>` as a temporary diagnostics probe that calls `DslScriptDiagnosticProvider` directly.
- `Entries/LanguageServerEntry.cs` exposes `--diagnose-project <root> [--entry title] [--override source.inscape temp.inscape]` as a temporary project diagnostics probe that uses Tooling source loading and Compiler project diagnostics without calling CLI.
- `Entries/LanguageServerEntry.cs` exposes `--definition-file <path> <nodeName>` as a temporary definition probe that calls `DslScriptDefinitionProvider` directly.
- `Entries/LanguageServerEntry.cs` exposes `--references-file <path> <nodeName>` and `--completion-file <path>` as temporary probes for graph-backed references and node completions.
- `Entries/LanguageServerEntry.cs` exposes `--document-symbols-file <path>` and `--hover-file <path> <node|jump> <name>` as temporary probes for outline and hover data.
- `Models/EditorLocationModel.cs` follows `docs/source-location-contracts.md`: editor positions use 0-based `line` / `character` / `length`.
- `DslScript/Domains/DslScriptDiagnosticProvider.cs` converts Compiler diagnostics from 1-based `line` / `column` into editor locations.
- `DslScript/Domains/DslScriptProjectDiagnosticProvider.cs` loads project `.inscape` sources through `Inscape.Tooling`, applies optional unsaved override content, and converts project diagnostics into editor locations.
- `DslScript/Domains/DslScriptDefinitionProvider.cs` resolves node definitions from Compiler source spans.
- `DslScript/Domains/DslScriptReferenceProvider.cs` and `DslScriptCompletionProvider.cs` read Compiler graph output for references and node completion items.
- `DslScript/Domains/DslScriptDocumentSymbolProvider.cs` and `DslScriptHoverProvider.cs` read Compiler graph output for node outline and basic node / jump hover.

VSCode client migration order and fallback boundaries are tracked in `docs/vscode-language-server-migration-plan.md`. Keep probe parity stable before moving VSCode hot paths from JS providers to LanguageServer.

Temporary probes are covered by internal parity tests. If you add or rename a probe, update `tests/Internal/Inscape.Tests/LanguageServer/TestLanguageServerBaseline.cs` in the same node.

Allowed business areas: `Entries`, `Models`, `DslScript`, `StoryGraph`, and `HostSchema`.

Do not create a broad project service here before narrower Compiler and Tooling contracts are stable.
