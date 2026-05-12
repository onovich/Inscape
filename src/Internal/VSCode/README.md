# VSCode

Owns the VSCode extension front end, editor providers, webview bridge, commands, and extension packaging source.

Allowed business areas: `ExtensionEntry`, `LanguageFeatures`, `EditorAuthoring`, and `PreviewWebview`.

Do not reimplement compiler semantics here. Use Compiler, Tooling, and later LanguageServer contracts as the source of truth.
