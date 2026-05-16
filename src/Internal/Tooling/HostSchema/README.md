# HostSchema

Owns reusable host schema template, query, event, validation, and export flows.

Allowed roles: `Domains`, `Controllers`, `Models`, and `ViewModels`.

Do not bind schema entries to a concrete Unity project or runtime implementation.

Current concrete responsibilities:

- `HostSchemaTemplateWriterDomain` writes the versioned host schema scaffold.
- `HostSchemaQueryReaderDomain` reads configured Host Schema `queries[]` into Tooling-owned capability models.
- `HostSchemaEventReaderDomain` reads configured Host Schema `events[]` into Tooling-owned capability models.
- `QueryInterpolationAuditDomain` audits simple `[]` query interpolation names against Host Schema and emits explicit authoring diagnostics.

Audit diagnostics use `IQI` codes and must not be mixed into `Inscape.Compiler` diagnostics.
