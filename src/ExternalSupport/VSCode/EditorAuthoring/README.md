# EditorAuthoring

Owns VSCode authoring support that is not specific to one DslScript semantic provider.

- `Providers` contains editor style, workspace text source, project config, CSV, and location helpers used by commands and language providers.

Shared editor-neutral project loading belongs in Internal `Tooling`; this directory only adapts those flows to VSCode authoring behavior.
