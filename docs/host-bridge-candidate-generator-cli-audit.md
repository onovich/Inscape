# Host Bridge Candidate Generator CLI Audit

Date: 2026-06-22

Status: Round 3 CLI command / diagnostics / output guard.

## Scope

Round 3 wires the registered CLI command to the shared Tooling domain:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-bridge-candidate-package <package-dir> -o <candidate.json>
```

The command now reads an existing Host Integration Package and writes a
deterministic UTF-8 without BOM `inscape.host-bridge-candidate` JSON artifact.

## CLI Boundary

`CliStoryGraphCommand` owns only:

- required `-o <candidate.json>` validation;
- output-directory rejection;
- package reader error to stderr / exit code mapping;
- shared domain invocation;
- JSON serialization and output path printing.

Candidate generation rules remain in `Inscape.Tooling`
`HostBridgeCandidateGenerationDomain`.

## Exit And Output Behavior

- Missing `-o`: exit `2`, no stdout.
- Output path points to a directory: exit `2`, no stdout.
- Missing package directory or unreadable manifest: package reader exit code,
  no candidate file.
- Unsupported package manifest `formatVersion`: exit `3`, no candidate file.
- Invalid or incompatible required candidate input artifact inside a readable
  package: exit `0` with candidate JSON that reports `summary.result` as
  `invalid` or `incompatible`.
- Success: exit `0`, writes candidate JSON and prints the full candidate path.

## Test Coverage

Round 3 adds CLI coverage for:

- generating a candidate from a real exported Host Integration Package;
- `format = "inscape.host-bridge-candidate"` and `formatVersion = 1`;
- `id-binding`, `action-handler`, and `query-handler` candidates from package
  diagnostics;
- `summary.writesHostData = false`;
- every candidate `review.required = true`;
- every candidate `ownership.generatedOwnership = "candidate-only"` and
  `ownership.writesHostData = false`;
- no UTF-8 BOM in the generated file;
- repeated generation byte stability;
- missing `-o`;
- directory output guard;
- missing package directory;
- invalid required artifact;
- unsupported package manifest version.

## Architecture Self-Check

- CLI does not duplicate candidate generation semantics.
- Package export still does not generate `host/host-bridge-candidate.json` by
  default.
- The command does not write confirmed Host Bridge data and does not apply
  generated mappings.
- This round does not enter POC-2 catalog projection, Runtime Preview Bridge,
  Sinan Runtime, Unity / Host SDK, full host save, Rollback, Trace Replay,
  Flashback, Presentation IR, or Host Schema action policy expansion.

## Validation

Round 3 validation:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
git diff --check
```

Expected result: all commands pass.
