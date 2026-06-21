# Host Integration Partner Readiness POC-1 Checklist

日期：2026-06-21

状态：Round 5 acceptance checklist baseline；用于 POC-1 static artifact exchange / dry-run readiness。

## Contract Readiness

- [x] Integration Package contract is documented in [Host Integration Package Contract](host-integration-package-contract.md).
- [x] Narrative graph external subset is documented in [Narrative Graph IR External Contract](narrative-graph-ir-external-contract.md).
- [x] Source refs are documented in [Source Location External Contract](source-location-external-contract.md).
- [x] Localization anchors are documented in [Localization Anchor Export Contract](localization-anchor-export-contract.md).
- [x] Host Bridge Candidate remains unconfirmed review evidence in [Host Bridge Candidate Contract](host-bridge-candidate-contract.md).
- [x] Readiness report shape is documented in [Host Integration Readiness Report Contract](host-integration-readiness-report-contract.md).

## Fixture / Smoke Readiness

- [x] Static fixture pack covers minimal dialogue, branching, localization, missing speaker, unknown action, unsupported feature and source diagnostic.
- [x] Static smoke command is documented in [Host Integration Static Artifact Smoke](host-integration-static-artifact-smoke.md).
- [x] Fixture ids are stable and unique.
- [x] Fixture source paths are package-relative under `source/`.
- [x] Diagnostic source refs use `compiler-1-based`.
- [x] Unknown action remains `schema-capability` / `blocked`.
- [x] Localization fixture does not claim host runtime localization id.
- [x] Candidate evidence keeps `writesHostData = false`.

## Partner Exchange Acceptance

- [x] POC-1 does not modify formal host data.
- [x] POC-1 does not introduce Sinan Runtime or any Sinan module as an Inscape core dependency.
- [x] Reports are deterministic and diffable.
- [x] Diagnostics can be traced back to Inscape source refs.
- [x] Host Bridge Candidate output requires manual review before becoming confirmed mapping.
- [x] Partner-specific ids remain partner evidence, not Compiler / Host Schema truth.

## Boundary Guard

- [x] No Unity / Host SDK implementation is part of POC-1.
- [x] No Runtime Preview Bridge is part of POC-1.
- [x] No complete host save/load is part of POC-1.
- [x] No Rollback / Trace Replay / Flashback work is part of POC-1.
- [x] No Presentation IR work is part of POC-1.
- [x] No Host Schema action policy fields such as `rollbackPolicy`, `replayPolicy`, `failurePolicy` or `timeoutPolicy` are added.

## Remaining Before Final Validation

- [ ] Run Round 6 final validation matrix.
- [ ] Write final validation report.
- [ ] Sync `docs/agent-handoff.md`, `docs/todo.md`, `docs/README.md` after Round 6.
- [ ] Commit and push final PASS/FAIL closure.
