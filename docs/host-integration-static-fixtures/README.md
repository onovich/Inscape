# Host Integration Static Fixtures

This directory contains static fixture data for Host Integration Partner Readiness.

Current files:

- `fixtures.json`: Round 4 fixture pack covering minimal dialogue, branching, localization, missing speaker, unknown action, unsupported feature and source diagnostic scenarios.
- `StaticArtifactFixtureSmoke.js`: Round 5 static smoke that parses the fixture pack and checks deterministic/diffable artifact rules.
- `HostIntegrationPackageCliSmoke.js`: Round 5 CLI smoke that creates a temporary workspace, runs `export-host-integration-package-project`, checks package structure / determinism / source refs, and verifies forbidden host candidate generation remains absent.

These fixtures are documentation/test evidence only. They are not runtime samples, generated host data, Unity assets, Sinan data, or confirmed Host Bridge mappings.

Run the smoke from the repository root:

```powershell
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
node docs\host-integration-static-fixtures\HostIntegrationPackageCliSmoke.js
```

The static fixture smoke does not compile source. The package CLI smoke invokes only the Inscape CLI package export command against a temporary local workspace. Neither smoke runs Runtime, connects Unity / Host SDK / Sinan Runtime, writes host data, or generates confirmed Host Bridge mappings.
