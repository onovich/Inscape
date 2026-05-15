# WorkspaceIndex

Owns editor-side workspace scans and lightweight indexes for nodes, speakers, host bindings, and metadata.

This layer supports authoring features only; project compilation semantics remain in `Compiler` and shared file/config flows remain in `Tooling`.

Index item fields follow `docs/workspace-index-contract.md`: source positions use 0-based `line` / `character` / `length`, and the layer may keep legacy fields only as compatibility aliases.
