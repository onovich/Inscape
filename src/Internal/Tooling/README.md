# Tooling

Owns reusable toolchain use cases shared by CLI, VSCode, future LanguageServer, and development workflows.

Allowed business areas: `DslScriptSources`, `ToolConfig`, `Preview`, `Localization`, `HostSchema`, `HostBinding`, and `UsageManifest`.

Allowed resource boundary: `Resources/Preview` owns static preview templates while Tooling remains the reusable project root. Do not create generic resource buckets outside concrete module roots.

Do not own compiler semantics. Use `Compiler` as the source of DSL truth, and keep command-line presentation in `Cli`.
