# Host Integration Static Fixtures

This directory contains static fixture data for Host Integration Partner Readiness.

Current files:

- `fixtures.json`: Round 4 fixture pack covering minimal dialogue, branching, localization, missing speaker, unknown action, unsupported feature and source diagnostic scenarios.
- `partner-feedback.generic.json`: Round 2 generic partner feedback fixture for the Static Artifact POC Partner Handoff Kit. It separates partner evidence, candidate evidence and confirmed truth, and keeps all write / apply / runtime flags false.
- `StaticArtifactFixtureSmoke.js`: Round 5 static smoke that parses the fixture pack and checks deterministic/diffable artifact rules.
- `HostIntegrationPackageCliSmoke.js`: Round 5 CLI smoke that creates a temporary workspace, runs `export-host-integration-package-project`, checks package structure / determinism / source refs, and verifies forbidden host candidate generation remains absent.
- `HostIntegrationReadinessReportSmoke.js`: Readiness report generator smoke that exports a temporary package, runs `generate-host-integration-readiness-report-package`, checks diagnostics aggregation, missing artifact / invalid JSON reporting, output path guards and deterministic repeated generation.
- `PartnerHandoffKitSmoke.js`: Round 3 handoff kit smoke that parses `partner-feedback.generic.json`, checks evidence separation, verifies all write / apply / runtime flags stay false and rejects Host Schema action policy expansion keys.

These fixtures are documentation/test evidence only. They are not runtime samples, generated host data, Unity assets, Sinan data, generated apply output, or confirmed Host Bridge mappings.

Run the smoke from the repository root:

```powershell
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationReadinessReportSmoke.js
node docs\host-integration-static-fixtures\PartnerHandoffKitSmoke.js
```

The static fixture smoke does not compile source. The package CLI smoke invokes only the Inscape CLI package export command against a temporary local workspace. The readiness report smoke invokes only package export and the standalone package readiness report generator against temporary local files. These smokes do not run Runtime, connect Unity / Host SDK / Sinan Runtime, write host data, or generate confirmed Host Bridge mappings.
