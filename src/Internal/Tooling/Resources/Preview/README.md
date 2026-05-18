# Preview Resources

Owns static HTML, CSS, and JavaScript templates consumed by `PreviewHtmlRendererDomain`.

This directory exists because `Tooling` is currently the reusable project root for CLI, VSCode, and future LanguageServer preview rendering. If Preview becomes an independently published project later, move these resources into that project root.

Do not place compiler semantics or VSCode webview lifecycle code here.
