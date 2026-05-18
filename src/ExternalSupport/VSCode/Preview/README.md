# Preview

Owns VSCode preview custom editor integration, refresh orchestration, source navigation, HTML handoff, and preview command invocation.

- `Providers` contains VSCode-facing preview providers and CLI invocation selection.
- `Controllers` contains preview refresh and source navigation controllers.
- `Bridges` contains editor-to-preview reveal coordination and small message handoff state.

Do not put source parsing or compiler semantics here.
