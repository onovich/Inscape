# Host Integration Static Fixtures

This directory contains static fixture data for Host Integration Partner Readiness.

Current files:

- `fixtures.json`: Round 4 fixture pack covering minimal dialogue, branching, localization, missing speaker, unknown action, unsupported feature and source diagnostic scenarios.
- `StaticArtifactFixtureSmoke.js`: Round 5 static smoke that parses the fixture pack and checks deterministic/diffable artifact rules.

These fixtures are documentation/test evidence only. They are not runtime samples, generated host data, Unity assets, Sinan data, or confirmed Host Bridge mappings.

Run the smoke from the repository root:

```powershell
node docs\host-integration-static-fixtures\StaticArtifactFixtureSmoke.js
```

The smoke is static-only. It does not compile source, run Runtime, connect Unity / Host SDK / Sinan Runtime, write host data, or generate confirmed Host Bridge mappings.
