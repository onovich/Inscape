# Host Bridge Candidate Generator Smoke Audit

Date: 2026-06-22

Status: Round 4 smoke fixture / determinism / docs hardening.

## Scope

Round 4 adds `HostBridgeCandidateGeneratorSmoke.js` under
`docs/host-integration-static-fixtures/`.

The smoke creates a temporary workspace, exports a Host Integration Package, and
then calls:

```powershell
dotnet run --project src\Internal\Cli\Inscape.Cli\Inscape.Cli.csproj -- generate-host-bridge-candidate-package <package-dir> -o <candidate.json>
```

## Coverage

The smoke verifies:

- package export still does not generate `host/host-bridge-candidate.json` by
  default;
- candidate output has `format = "inscape.host-bridge-candidate"` and
  `formatVersion = 1`;
- output is UTF-8 without BOM;
- repeated candidate generation against the same package is byte-stable;
- declared action/query gaps produce review-only handler candidates;
- required id gaps produce review-only id-binding candidates;
- unknown action/query usage stays blocked as `schema-capability`;
- unknown action usage does not fabricate an `action-handler`;
- every candidate requires review;
- every candidate keeps `generatedOwnership = "candidate-only"` and
  `writesHostData = false`;
- source refs use `compiler-1-based`;
- missing `-o` and directory output guards fail clearly.

Representative local smoke output. The SHA is produced from the temporary
package exported in that smoke run; the invariant is byte-stability when the
candidate generator runs repeatedly against the same exported package.

```json
{
  "status": "pass",
  "deterministic": true,
  "candidateSha256": "21552907f030b6432b4d2ae6b1fb6cad50923bf8ec34a6a5fe3a4953f158dd08",
  "candidateCount": 5,
  "blockedCount": 2,
  "writesHostData": false,
  "generatedOwnership": "candidate-only",
  "hostBridgeConfirmed": false,
  "generatedApply": false
}
```

## Architecture Self-Check

- The smoke invokes package export and the standalone candidate generator only.
- It does not run Runtime or SelfHostedEditor.
- It does not connect Unity, Host SDK, Sinan Runtime, or partner services.
- It does not write confirmed Host Bridge data, apply generated mappings, or
  create a package artifact that should be committed.
- It does not enter POC-2 catalog projection, full host save, Rollback, Trace
  Replay, Flashback, Presentation IR, or Host Schema action policy expansion.

## Validation

Round 4 smoke validation:

```powershell
node --check docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
node docs\host-integration-static-fixtures\HostBridgeCandidateGeneratorSmoke.js
```

Expected result: both commands pass.
