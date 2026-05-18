# Preview

Owns preview-oriented shared rendering and view models that can be reused by CLI and VSCode.

Allowed roles: `Domains`, `Controllers`, `Models`, and `ViewModels`.

Static preview templates live under `../Resources/Preview` at the Tooling project root so HTML, CSS, and browser JavaScript stay outside C# rendering logic.

Do not own VSCode webview lifecycle or compiler graph semantics.
