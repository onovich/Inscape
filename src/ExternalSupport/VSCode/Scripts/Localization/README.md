# Localization

Owns VSCode command entry points for localization workflows.

- `Commands` contains VSCode command handlers that invoke Internal Tooling / CLI localization flows and adapt file picker progress to the editor.

Shared localization extraction, update, and merge semantics belong in Internal `Tooling` and `Compiler`; this directory only adapts those flows to VSCode.
