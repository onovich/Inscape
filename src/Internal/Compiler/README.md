# Compiler

Owns compiler truth for the DSL: parsing, analysis, diagnostics, source mapping, graph construction, and localization anchors.

Allowed business areas: `DslScript`, `StoryGraph`, `Localization`, `Diagnostics`, and `TextContracts`.

Do not depend on Unity, VSCode, HTML rendering, CLI presentation, or third-party host packages.

The current project file is `src/Internal/Compiler/Inscape.Compiler.csproj`. Keep namespaces coarse under `Inscape.Compiler.*`; do not mirror every business or role directory in the namespace unless a stable public boundary needs it.
