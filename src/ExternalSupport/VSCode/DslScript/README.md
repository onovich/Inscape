# DslScript

Owns VSCode authoring features whose business subject is the Inscape DSL script itself.

- `Providers` contains VSCode provider implementations for completion, definition, references, hover, symbols, CodeLens, and lightweight DslScript authoring hints.
- `Controllers` contains DslScript diagnostics orchestration.

Compiler semantics still belong to Internal `Inscape.Compiler` / `Inscape.LanguageServer`. This directory may call those contracts, but must not redefine parser truth.
