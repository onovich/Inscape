# Host Integration Readiness Report Generator Smoke Audit

Date: 2026-06-22

Conclusion: Round 4 Fixtures / Smoke / Docs Hardening is complete.

## Completed

- Added `docs/host-integration-static-fixtures/HostIntegrationReadinessReportSmoke.js`.
- Updated static fixture README and smoke documentation.
- Updated the readiness report contract with standalone package generator semantics.
- Updated the CLI command reference with `generate-host-integration-readiness-report-package`.
- Fixed `CliCore.WriteOrPrint` to write UTF-8 without BOM so generated JSON can be
  parsed directly by Node and partner tooling.

## Smoke Coverage

`HostIntegrationReadinessReportSmoke.js` creates a temporary workspace, exports a
real Host Integration Package, and then calls the standalone package readiness
report generator.

Covered states:

- real package report generation;
- compiler diagnostic and Host Integration Audit diagnostic aggregation;
- package-relative source refs;
- missing required artifact -> `summary.result = "missing"`;
- invalid JSON artifact -> `summary.result = "invalid"`;
- missing `-o` and output-directory guard;
- repeated generation byte determinism;
- `writesHostData = false`;
- no Runtime integration;
- no Runtime Preview Bridge;
- no Host Bridge candidate generation.

## Debug Self-Check

- The smoke localizes failures to package export, package reader, report
  generator, output path guard, or JSON parseability.
- Failure fixtures are minimal and temporary.
- The smoke proves the report generator layer, not only package export.
- Repeated generation uses the same explicit output path and verifies byte
  stability.
- JSON output is verified without accepting a BOM fallback.

## Architecture Self-Check

- Report semantics remain in `Inscape.Tooling`.
- CLI only maps arguments, invokes the shared domain, writes output, and reports
  exit codes.
- The smoke does not add host-specific report rules.
- VSCode and SelfHostedEditor do not duplicate readiness report semantics.
- The round did not implement Host Bridge Candidate Generator, partner handoff,
  POC-2 catalog projection, Sinan Runtime Integration, Runtime Preview Bridge,
  Unity / Host SDK, generated apply, full host save, Rollback / Trace Replay /
  Flashback, Presentation IR, or Host Schema action policy expansion.

## Validation

Passed:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- commands
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- help generate-host-integration-readiness-report-package
node --check docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
git diff --check
```

## Boundary Scans

All scans produced no output. Per the goal guide, no output is recorded as PASS.

```powershell
rg -n "Sinan|sinan" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources
rg -n "rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\Internal src\ExternalSupport\VSCode\Resources src\ExternalSupport\SelfHostedEditor\Resources -g "*.cs" -g "*.js" -g "*.json"
rg -n "using\s+Unity|UnityEngine|UnityEditor|Addressables|ScriptableObject|\bBird\b" src\Internal -g "*.cs" -g "*.csproj"
rg -n "ConditionEvaluator|ActionDispatcher|QueryReceipt|RuntimeInspector|SubstateValidator|LogBuilder|rollbackPolicy|replayPolicy|failurePolicy|timeoutPolicy" src\ExternalSupport\SelfHostedEditor\Scripts src\ExternalSupport\VSCode -g "*.js" -g "*.json"
```
