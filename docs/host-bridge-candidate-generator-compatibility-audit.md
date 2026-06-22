# Host Bridge Candidate Generator Compatibility Audit

Date: 2026-06-22

Status: Round 5 buffer / edge-case hardening / compatibility closure.

## Scope

Round 5 closes the first-slice compatibility gap between the standalone Host
Bridge Candidate generator and the Host Integration Readiness Report generator.

Implemented behavior:

- readiness report generation summarizes an already-existing
  `host/host-bridge-candidate.json`;
- readiness report generation still does not create, rewrite, accept or apply
  candidate evidence;
- candidate generation ignores unrelated optional
  `reports/readiness-report.json` parse failures and continues to use only its
  required package inputs.

## Existing Candidate Summary

`HostIntegrationPackageReadinessReportDomain` now probes the fixed optional
candidate path:

```text
host/host-bridge-candidate.json
```

If the file exists, the readiness report validates the candidate artifact
format and supported `formatVersion`, then copies only summary-level evidence:

- `hostBridgeCandidate.status`
- `hostBridgeCandidate.candidateCount`
- `hostBridgeCandidate.writesHostData`

Blocked, invalid, incompatible or host-writing candidate evidence affects the
top-level readiness `summary.result`. Missing candidate evidence remains an
optional `missing` status and does not block readiness on its own.

## Candidate Generator Compatibility

The Host Bridge Candidate generator continues to read only these package
artifacts as semantic inputs:

- `usage/usage.json`
- `host/host-schema-capabilities.json`
- `host/host-integration-audit.json`

An invalid optional readiness report artifact is intentionally ignored by the
candidate generator. This keeps the standalone candidate generator independent
from report artifacts and avoids report/candidate feedback loops.

## Test And Smoke Coverage

Round 5 adds internal coverage for:

- readiness report summary of an existing blocked candidate artifact;
- candidate generation with an invalid optional readiness report artifact.

`HostIntegrationReadinessReportSmoke.js` now also:

- confirms package export does not generate candidate evidence by default;
- explicitly runs `generate-host-bridge-candidate-package` only on a copied
  package;
- verifies readiness report generation summarizes the existing candidate;
- verifies readiness report generation does not rewrite the existing candidate;
- keeps `hostBridgeCandidateGenerated = false` and
  `readinessGeneratedCandidate = false` for the report generator path.

## Architecture Self-Check

- Candidate generation rules stay in shared `Inscape.Tooling`.
- CLI remains a thin command shell for explicit generation only.
- Readiness report generation reads existing candidate evidence but does not
  call the candidate generator.
- Package export still does not generate `host/host-bridge-candidate.json`.
- No confirmed Host Bridge write, generated apply, POC-2 catalog projection,
  Runtime Preview Bridge, Sinan Runtime, Unity / Host SDK, full host save,
  Rollback, Trace Replay, Flashback, Presentation IR or Host Schema action
  policy expansion was introduced.

## Validation

Round 5 validation:

```powershell
dotnet build Inscape.slnx --no-restore
dotnet run --project tests\Internal\Inscape.Tests\Inscape.Tests.csproj --no-build
node --check docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node --check docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
git diff --check
```

Expected result: all commands pass.
