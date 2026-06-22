# Host Bridge Candidate Generator Baseline Audit

Date: 2026-06-22

Status: Round 1 baseline / command contract / source-of-truth audit.

## Scope

This round starts the `Host Bridge Candidate Generator First Slice` phase. The
target command is:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-bridge-candidate-package <package-dir> -o <candidate.json>
```

Round 1 only registers the CLI command contract, help text and a guarded
dispatch skeleton. The generator domain itself lands in later rounds.

## Source Of Truth

The generator must read an existing Host Integration Package through shared
`Inscape.Tooling` package-reader paths. It must not recompile the original
workspace, parse `.inscape` source text, or infer DSL semantics from package
source files.

Candidate evidence can be derived only from existing package artifacts:

- `manifest.json`
- `usage/usage.json`
- `host/host-schema-capabilities.json`
- `host/host-integration-audit.json`
- `source-map/source-locations.json`
- optional existing `host/inscape.host.bridge.json` or package-declared Host
  Bridge evidence when available in a later round

## Command Contract

`generate-host-bridge-candidate-package` is listed in `inscape commands` and has
dedicated `inscape help generate-host-bridge-candidate-package` output.

The command requires `-o <candidate.json>`. The output target must be a file,
not a directory. In Round 1, direct execution returns a guarded not-yet-wired
message so callers cannot mistake the command skeleton for a completed
generator.

Expected final behavior for later rounds:

- read package artifacts through shared Tooling;
- write deterministic UTF-8 without BOM JSON;
- write `format = "inscape.host-bridge-candidate"` and `formatVersion = 1`;
- keep `summary.writesHostData = false`;
- keep every candidate `ownership.generatedOwnership = "candidate-only"` and
  `ownership.writesHostData = false`;
- return schema-capability / blocked evidence for unknown query/action usage
  instead of inventing fake handler mappings;
- return action-handler / query-handler candidates only for actions or queries
  already declared in Host Schema.

## Boundary Checks

Confirmed boundaries after Round 1:

- `export-host-integration-package-project` still does not list or write
  `host/host-bridge-candidate.json` by default.
- `generate-host-integration-readiness-report-package` still does not generate a
  candidate artifact.
- `HostIntegrationPackageManifestDomain` still indexes only the existing static
  package artifacts and readiness report.
- `HostIntegrationPackageExportDomain` writable artifact paths still exclude
  `host/host-bridge-candidate.json`.

## Architecture Self-Check

- Compiler remains independent from Host Schema, Host Bridge, package
  generation, Unity, VSCode and host SDK concepts.
- CLI only exposes command metadata, argument guard and dispatch. Reusable
  generation logic is reserved for `Inscape.Tooling`.
- Host Bridge Candidate remains review evidence, not confirmed Host Bridge
  truth.
- This round does not implement generated apply, POC-2 catalog projection,
  Runtime Preview Bridge, Sinan Runtime, Unity / Host SDK, full host save,
  Rollback, Trace Replay, Flashback, Presentation IR, or Host Schema action
  policy expansion.

## Validation

Round 1 validation:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-bridge-candidate-package
git diff --check
```

Expected result: all commands pass. Boundary scans remain deferred to final
validation unless a round touches prohibited areas.
