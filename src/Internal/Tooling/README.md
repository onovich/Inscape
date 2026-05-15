# Tooling

Owns reusable toolchain use cases shared by CLI, VSCode, future LanguageServer, and development workflows.

Allowed business areas: `DslScriptSources`, `ToolConfig`, `Preview`, `Localization`, `HostSchema`, and `HostBinding`.

Do not own compiler semantics. Use `Compiler` as the source of DSL truth, and keep command-line presentation in `Cli`.
