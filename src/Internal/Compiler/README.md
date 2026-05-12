# Compiler

Owns compiler truth for the DSL: parsing, analysis, diagnostics, source mapping, graph construction, and localization anchors.

Allowed business areas: `DslScript`, `StoryGraph`, `Localization`, `Diagnostics`, and `TextContracts`.

Do not depend on Unity, VSCode, HTML rendering, CLI presentation, or third-party host packages.

The current project name may remain `Inscape.Compiler` during path migration. Rename projects, namespaces, and types only after paths and project references are stable.
