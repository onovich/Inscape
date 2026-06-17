# HostSchema

Owns reusable host schema template, query, action, legacy event, validation, and export flows.

Allowed roles: `Domains`, `Controllers`, `Models`, and `ViewModels`.

Do not bind schema entries to a concrete Unity project or runtime implementation.

Current concrete responsibilities:

- `HostSchemaTemplateWriterDomain` writes the versioned host schema scaffold.
- `HostSchemaQueryReaderDomain` reads configured Host Schema `queries[]` into Tooling-owned capability models.
- `HostSchemaTemplateWriterDomain` emits the P3 `actions[]` scaffold.
- `HostSchemaEventReaderDomain` reads legacy Host Schema `events[]` into Tooling-owned capability models until the P3 action reader lands.
- `QueryInterpolationAuditDomain` audits simple `[]` query interpolation names against Host Schema and emits explicit authoring diagnostics.

Audit diagnostics use `IQI` codes and must not be mixed into `Inscape.Compiler` diagnostics.
