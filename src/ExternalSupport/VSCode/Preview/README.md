# Preview

Owns VSCode preview custom editor integration, refresh orchestration, source navigation, HTML handoff, and preview command invocation.

- `Providers` contains VSCode-facing preview providers and CLI invocation selection.
- `Commands` contains VSCode command handlers for opening, toggling, and revealing preview content.
- `Controllers` contains preview refresh and source navigation controllers.
- `Bridges` contains editor-to-preview reveal coordination and small message handoff state.
- `Models` contains preview data defaults used by commands and providers.

Refresh orchestration may send lightweight webview status messages, such as `previewStatus`, but must not mutate story state, path history, or compiler output.

Do not put source parsing or compiler semantics here.
