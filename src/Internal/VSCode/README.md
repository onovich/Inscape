# VSCode

Owns the VSCode extension front end, editor providers, webview bridge, commands, and extension packaging source. This is first-party Inscape authoring tooling, so it belongs under `Internal` rather than `ExternalSupport`.

Allowed business areas: `ExtensionEntry`, `LanguageFeatures`, `EditorAuthoring`, and `PreviewWebview`.

Do not reimplement compiler semantics here. Use Compiler, Tooling, and later LanguageServer contracts as the source of truth.

Keep host-specific adapters out of this tree. Unity, Bird, or other host integrations belong under `ExternalSupport`.

For package-level structure, keep long-lived code, resources, and development scripts visibly separated inside the package root. VSCode-specific resources such as icons, schemas, snippets, TextMate grammars, and packaged templates should not be hidden inside logic files when they can live as package resources.
