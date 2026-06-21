# Host Integration Partner Readiness Fixtures

日期：2026-06-21

状态：Round 5 static artifact fixture baseline；已接入 POC-1 static artifact smoke / partner dry-run planning。

## 目标

本文件说明 Round 4 的 static artifact fixtures。它们用于验证 Host Integration Package、source location、localization anchor 和 Host Bridge candidate 契约是否能覆盖最小外部宿主对接场景。

实际 fixture pack 位于：

```text
docs/host-integration-static-fixtures/fixtures.json
```

该 pack 是静态 JSON 证据，不是 Compiler sample、Runtime sample 或 host adapter 输出。Round 5 在此基础上建立了 static artifact smoke，见 [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md)。

## 覆盖矩阵

| Fixture | Required Scenario | Main Artifact Evidence | Expected Candidate/Audit Shape |
| --- | --- | --- | --- |
| `minimal-dialogue` | minimal dialogue | source + graph + empty usage | no candidate; package ready |
| `branching` | branching | choice condition usage + required item id | query handler + item id candidates |
| `localization` | localization | CSV + anchor map + source map | no host runtime localization id |
| `missing-speaker` | missing speaker | dialogue speaker not in bridge | speaker id-binding candidate |
| `unknown-action` | unknown action | schema action usage missing in Host Schema | blocked `schema-capability` candidate |
| `unsupported-feature` | unsupported feature | supported profile excludes `node.enter` timeline hook | unsupported timeline candidate |
| `source-diagnostic` | source diagnostic | compiler diagnostic source ref | readiness report diagnostic with source |

## Fixture Pack Contract

The fixture pack uses:

```json
{
  "format": "inscape.host-integration.static-fixtures",
  "formatVersion": 1,
  "fixtures": []
}
```

Each fixture records:

- `id`: stable fixture id.
- `requiredScenario`: scenario from the goal guide.
- `profile`: generic or partner-profile metadata.
- `source`: package-relative source path and source lines.
- `artifactCoverage`: expected package artifacts exercised by the fixture.
- `expected`: bounded expected status, diagnostics and candidates.

Fixture source lines intentionally remain small so smoke checks can diff them and generate package slices deterministically.

## Static Artifact Boundaries

Fixtures may describe:

- `.inscape` source content.
- Expected package artifact kinds.
- Expected Host Integration Audit codes.
- Expected Host Bridge candidate kinds/statuses.
- Expected source refs.

Fixtures must not describe:

- Runtime execution result.
- Host save/load state.
- Generated host data write.
- Sinan runtime data layout.
- Unity Editor importer behavior.
- Rollback / Trace Replay / Flashback behavior.

## Partner Profile Use

Only `unsupported-feature` uses a partner-style support profile in this fixture pack. It still uses `partner = "generic"` because Round 4 is validating the common candidate boundary. Sinan-specific profile examples are deferred to the Round 5 Sinan Static Artifact POC Planning Note.

If a future Sinan fixture is added, it must keep the same boundary:

- profile / fixture metadata may say `sinan`;
- static catalog projection may create candidates;
- no core dependency, runtime integration, hard dependency or Sinan-only Host Schema policy may appear.

## Static Smoke

Round 5 validates the fixture pack with [StaticArtifactFixtureSmoke.js](host-integration-static-fixtures/StaticArtifactFixtureSmoke.js). The smoke checks:

- JSON parse succeeds.
- Fixture ids are unique.
- All seven required scenarios are present.
- Every fixture has package-relative source path.
- Every expected diagnostic with source uses `compiler-1-based`.
- Every candidate has `candidateKind`, `status` and `writesHostData = false`.
- Unknown action uses `schema-capability` / `blocked`, not fake `action-handler`.
- Localization fixture does not include host runtime localization id.

## Round 5 Self-Check

- The seven required fixture scenarios are present.
- The pack is deterministic and diffable JSON.
- Diagnostics and candidates carry source refs where applicable.
- Candidate evidence does not write host data.
- Fixtures do not introduce Sinan-specific core semantics or Host Schema action policy fields.
- The fixture smoke does not compile source, run Runtime, connect Sinan Runtime / Unity / Host SDK or generate confirmed Host Bridge mappings.
