# WorkspaceIndex

Owns editor-side workspace scans and lightweight indexes for nodes, speakers, host bindings, query interpolations, and metadata.

This layer supports authoring features only; project compilation semantics remain in `Compiler` and shared file/config flows remain in `Tooling`.

Index item fields follow `docs/workspace-index-contract.md`: source positions use 0-based `line` / `character` / `length`. Goal 0 removed legacy authoring aliases from the current workspace-index contract; historical migration notes belong in docs, not in provider output.

Query interpolation provider work is authoring-hint only. It may read `hostSchema` query names and recognize simple `[query.path]` ranges, but it must not turn missing Host Schema entries into compiler truth or treat colon-form bracket metadata as queries.
