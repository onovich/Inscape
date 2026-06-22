# Host Integration Readiness Report Generator CLI Audit

Date: 2026-06-22

Conclusion: Round 3 CLI Command / Diagnostics Aggregation is complete.

Round 3 added the standalone package readiness report command:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package <package-dir> -o <report.json>
```

The command reads an existing Host Integration Package. It does not recompile the
workspace, parse `.inscape` sources, generate Host Bridge candidates, run Runtime,
or write host data.

## Completed

CLI entry:

- `commands` and `help` list `generate-host-integration-readiness-report-package`.
- The command requires `-o <report.json>`.
- Package read failures, missing manifests, invalid manifests, and incompatible
  manifests are reported by the shared Tooling reader.
- A directory output path returns a usage error.
- On success, the command writes readiness report JSON and prints the report path.

Tooling semantics:

- `HostIntegrationPackageReadinessReportDomain` aggregates compiler diagnostics
  and Host Integration Audit diagnostics.
- `export-host-integration-package-project` continues to call the same shared
  report generator, so exported reports and standalone regenerated reports share
  summary and diagnostic rules.
- Compiler diagnostics are collected from `graph/project-ir.json` or the package
  export context.
- Host Integration Audit diagnostics are collected from
  `host/host-integration-audit.json` or the package export context.
- Source refs are normalized to package-relative `source/*.inscape` paths through
  the package source map or export source mapper.

Summary rules:

- Invalid artifacts produce `summary.result = "invalid"`.
- Incompatible artifacts produce `summary.result = "incompatible"`.
- Missing required artifacts produce `summary.result = "missing"`.
- Error diagnostics produce `summary.result = "blocked"`.
- Artifact `blocked` and `unsupported` statuses keep their corresponding summary
  status when no higher-priority state exists.
- Package boundary flags remain static from the package view; for example,
  `writesHostData = false`.

## Tests / Smoke

Added or updated:

- Internal tests cover the new CLI help entry.
- Internal tests cover standalone readiness report generation from an exported
  package.
- Internal tests cover diagnostics aggregation.
- `HostIntegrationPackageCliSmoke.js` now verifies the diagnostic-blocked
  readiness report summary plus compiler and Host Integration Audit diagnostic
  source refs.

## Round 3 Self-Check

Debug self-check:

- The new CLI command can generate a report from a real package.
- Diagnostic source refs resolve to package `source/story.inscape`.
- Unknown actions remain Host Integration Audit diagnostics instead of being
  auto-fixed by CLI.
- Package export smoke remains byte-stable.

Architecture self-check:

- CLI only performs argument handling, shared Tooling calls, file output,
  stdout/stderr, and exit codes.
- Report generation and package reading remain in `Inscape.Tooling`.
- Compiler remains the graph and diagnostic source of truth.
- VSCode and SelfHostedEditor do not duplicate readiness report semantics.
- The round did not implement Host Bridge Candidate Generator, Static Artifact
  POC partner handoff, POC-2 catalog projection, Sinan Runtime Integration,
  Runtime Preview Bridge, Unity / Host SDK, generated apply, full host save,
  Rollback / Trace Replay / Flashback, Presentation IR, or Host Schema action
  policy expansion.

## Validation

Already run and passed:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-integration-readiness-report-package
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- export-host-integration-package-project samples -o artifacts\host-integration-package-round3
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-integration-readiness-report-package artifacts\host-integration-package-round3 -o artifacts\host-integration-package-round3\reports\readiness-report.regenerated.json
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
```

Pre-commit check:

```powershell
git diff --check
```
