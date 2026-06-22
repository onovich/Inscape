# Host Bridge Candidate Generator Domain Audit

Date: 2026-06-22

Status: Round 2 shared Tooling candidate domain / package reader integration.

## Scope

Round 2 adds the shared `Inscape.Tooling` candidate generation domain under
`src/Internal/Tooling/HostBridgeCandidate/`.

The domain consumes an existing Host Integration Package and creates an
in-memory `inscape.host-bridge-candidate` model. CLI file output is intentionally
left for Round 3.

## Inputs

The generator reads package artifacts through `HostIntegrationPackageReaderDomain`
and does not compile the original workspace:

- `usage/usage.json`
- `host/host-schema-capabilities.json`
- `host/host-integration-audit.json`

The package reader remains responsible for manifest, path, JSON shape, `format`,
and `formatVersion` checks.

## Candidate Mapping Rules

Implemented first-slice mappings:

- `HIA004` missing Host Bridge id binding becomes `id-binding` or
  `resource-binding` evidence.
- `HIA007` missing Host Bridge action handler becomes `action-handler` only
  when the action is declared by Host Schema.
- `HIA008` missing Host Bridge query handler becomes `query-handler` only when
  the query is declared by Host Schema.
- `HIA001` unknown query and `HIA002` unknown action become blocked
  `schema-capability` evidence. The generator does not fabricate handler
  candidates for capabilities missing from Host Schema.

Every candidate keeps:

- `review.required = true`
- `ownership.generatedOwnership = "candidate-only"`
- `ownership.writesHostData = false`
- `summary.writesHostData = false`

## Status Handling

Round 2 covers the package-level statuses expected by the first slice:

- `empty`: package is valid and no candidate-producing diagnostics are present.
- `ready`: reviewable candidates exist and none are blocked.
- `blocked`: required artifacts are missing or schema capability evidence is
  required before a handler can be reviewed.
- `invalid`: a required artifact is malformed or violates expected shape.
- `incompatible`: a required artifact declares a newer unsupported
  `formatVersion`.

## Tests

New internal tests cover:

- empty ready package;
- ready id/action/query candidates;
- blocked unknown action/query schema capability evidence;
- invalid usage artifact;
- incompatible usage artifact.

These tests also assert candidate-only ownership and `writesHostData = false`.

## Architecture Self-Check

- The new generation logic lives in shared `Inscape.Tooling`.
- CLI remains a thin command shell until Round 3 wires the command to the shared
  domain.
- The generator reads existing package artifacts only; it does not parse
  `.inscape` text or duplicate compiler semantics.
- The generator does not write confirmed Host Bridge data, does not apply
  generated mappings, and does not enter POC-2 catalog projection, Runtime
  Preview Bridge, Sinan Runtime, Unity / Host SDK, full host save, Rollback,
  Trace Replay, Flashback, Presentation IR, or Host Schema action policy
  expansion.

## Validation

Round 2 validation:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
git diff --check
```

Expected result: all commands pass.
